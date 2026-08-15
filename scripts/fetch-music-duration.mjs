import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseBuffer } from 'music-metadata';
import yaml from 'js-yaml';

const MUSIC_DATA_PATH = path.resolve('src/data/music.json');
const CONFIG_PATH = path.resolve('ryuchan.config.yaml');
const CONTENT_REPO = process.env.CONTENT_REPO || path.resolve('../ryuchan-content');
const CUSTOM_PLAYLISTS_DIR = path.resolve(CONTENT_REPO, 'src/content/music/custom');
const CONCURRENCY = 8;
const RETRIES = 3;
const SAVE_INTERVAL = 20; // incremental save every N resolved
const SILENT = process.argv.includes('--silent');
const PROGRESS = process.argv.includes('--progress');
const VERBOSE = process.argv.includes('--verbose');

const log = (...args) => { if (!SILENT) console.log(...args); };
const warn = (...args) => { console.warn(...args); };
const progressLog = (...args) => { if (PROGRESS) console.log(...args); };

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * @param {string} apiBase Meting API 基址，来自 ryuchan.config.yaml music.api
 * @param {string} playlistId 歌单 ID
 * @param {string} server 平台来源 netease | tencent
 */
async function fetchPlaylistSongs(apiBase, playlistId, server = 'netease') {
  const base = (apiBase || 'https://meting.mikus.ink/api').replace(/\/+$/, '');
  const apiUrl = `${base}?server=${encodeURIComponent(server || 'netease')}&type=playlist&id=${encodeURIComponent(playlistId)}`;
  log(`  🎵 Fetching playlist ${playlistId} (${server}) via ${base}...`);
  try {
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`Meting API failed: ${res.statusText}`);
    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error('Unexpected API response (not an array)');
    }
    return data.map(item => {
      let songUrl = item.url?.replace(/http:\/\//g, 'https://');
      let lrcUrl = item.lrc?.replace(/http:\/\//g, 'https://');
      // 不加 br 参数，让上游返回最高可用音质
      // 兼容不同 Meting 实例的字段命名：
      // - 经典: name / artist / artist_name / pic
      // - mikus.ink 等: title / author / pic
      return {
        title: item.name || item.title || 'Unknown',
        artist: item.artist || item.artist_name || item.author || 'Unknown',
        cover: (item.pic || item.cover || '')?.replace?.(/http:\/\//g, 'https://') || item.pic || item.cover || '',
        url: songUrl,
        lrc: lrcUrl,
        duration: ""
      };
    });
  } catch (e) {
    console.error(`  ❌ Failed to fetch playlist ${playlistId}:`, e.message);
    return null;
  }
}

/**
 * Fetch duration for a single song with retries.
 * 1) Netease song detail API（netease）
 * 2) QQ Music song detail API（tencent，interval 秒）
 * 3) Content-Range 总大小估算（对 m4a 部分请求有效）
 * 4) buffer 解析音频流（兜底）
 * Returns true on success, false after all retries exhausted.
 */
async function fetchDurationForSong(item) {
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      if (item.url) {
        let parsedUrl;
        try {
          parsedUrl = new URL(item.url);
        } catch {
          parsedUrl = null;
        }

        if (parsedUrl) {
          const id = parsedUrl.searchParams.get('id');
          const server = parsedUrl.searchParams.get('server') || 'netease';

          // --- Path A: Netease detail API ---
          if (id && server === 'netease') {
            try {
              const res = await fetch(`https://music.163.com/api/song/detail/?id=${id}&ids=[${id}]`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
              });
              if (res.ok) {
                const data = await res.json();
                if (data?.songs?.[0]?.duration) {
                  item.duration = formatDuration(data.songs[0].duration / 1000);
                  return true;
                }
              }
            } catch {
              // fall through
            }
          }

          // --- Path A2: QQ Music detail API (songmid) ---
          if (id && server === 'tencent') {
            try {
              const res = await fetch(
                `https://c.y.qq.com/v8/fcg-bin/fcg_play_single_song.fcg?songmid=${encodeURIComponent(id)}&format=json`,
                {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    Referer: 'https://y.qq.com/'
                  }
                }
              );
              if (res.ok) {
                const data = await res.json();
                const interval = data?.data?.[0]?.interval;
                if (interval && Number(interval) > 0) {
                  item.duration = formatDuration(Number(interval));
                  return true;
                }
              }
            } catch {
              // fall through
            }
          }

          // --- Path B: Content-Range total + known bitrate guess for QQ C400 AAC ---
          // 部分 CDN 对 Range 友好，m4a 的 moov 常在文件末尾，buffer 解析易失败。
          try {
            const headRes = await fetch(item.url, {
              headers: {
                Range: 'bytes=0-0',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              },
              redirect: 'follow'
            });
            const cr = headRes.headers.get('content-range'); // e.g. bytes 0-0/3283546
            const match = cr && /\/(\d+)$/.exec(cr);
            if (match) {
              const totalBytes = Number(match[1]);
              const finalUrl = headRes.url || item.url;
              // QQ C400 ≈ 96kbps AAC；C400 文件名也常见
              if (totalBytes > 0 && (/C400/i.test(finalUrl) || server === 'tencent')) {
                const seconds = (totalBytes * 8) / 96000;
                if (seconds > 5 && seconds < 60 * 30) {
                  item.duration = formatDuration(seconds);
                  return true;
                }
              }
              // 通用 128kbps 估算（仅当像 mp3 且大小合理）
              if (totalBytes > 0 && /\.mp3(\?|$)/i.test(finalUrl)) {
                const seconds = (totalBytes * 8) / 128000;
                if (seconds > 5 && seconds < 60 * 30) {
                  item.duration = formatDuration(seconds);
                  return true;
                }
              }
            }
          } catch {
            // fall through
          }
        }
      }

      // --- Path C: buffer parsing（增大取样，并对 m4a 尝试读取文件尾部 moov）---
      if (item.url) {
        const ok = await fetchDurationFromBuffer(item);
        if (ok) return true;
      }
    } catch {
      // retry on error
    }

    if (attempt < RETRIES - 1) {
      await sleep(1000 * Math.pow(2, attempt)); // 1s, 2s, 4s
    }
  }

  return false;
}

/**
 * 通过下载音频片段解析时长。
 * m4a/mp4 的 moov 可能在文件末尾，因此会先尝试尾部 Range。
 */
async function fetchDurationFromBuffer(item) {
  const headersBase = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };

  // 先探测总大小
  let totalSize = 0;
  try {
    const probe = await fetch(item.url, {
      headers: { ...headersBase, Range: 'bytes=0-0' },
      redirect: 'follow'
    });
    const cr = probe.headers.get('content-range');
    const m = cr && /\/(\d+)$/.exec(cr);
    if (m) totalSize = Number(m[1]);
  } catch {
    // ignore
  }

  const ranges = [];
  // 优先尾部（moov at end）
  if (totalSize > 1024 * 64) {
    const tailStart = Math.max(0, totalSize - 1024 * 512);
    ranges.push(`bytes=${tailStart}-${totalSize - 1}`);
  }
  // 再试头部大一点
  ranges.push('bytes=0-1500000');
  // 再试中间（部分情况）
  if (totalSize > 1024 * 1024 * 2) {
    const mid = Math.floor(totalSize / 2);
    ranges.push(`bytes=${mid}-${mid + 1024 * 256}`);
  }

  for (const range of ranges) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const response = await fetch(item.url, {
        headers: { ...headersBase, Range: range },
        signal: controller.signal,
        redirect: 'follow'
      });
      clearTimeout(timeoutId);

      if (!(response.ok || response.status === 206)) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 1024) continue;

      const metadata = await parseBuffer(buffer, {
        mimeType: response.headers.get('content-type') || undefined
      });
      if (metadata?.format?.duration) {
        item.duration = formatDuration(metadata.format.duration);
        return true;
      }
    } catch {
      // try next range
    }
  }

  return false;
}

/**
 * Compute a lightweight fingerprint from sorted unique URLs only.
 * Much faster than serializing full song objects.
 */
function computeUrlFingerprint(urls) {
  return crypto
    .createHash('sha256')
    .update([...urls].sort().join('\n'))
    .digest('hex');
}

/**
 * Compute config fingerprint to detect playlist config changes.
 * Only includes playlist IDs and types — no API calls needed.
 */
function computeConfigFingerprint(playlists, apiBase) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({
      api: apiBase || '',
      playlists: playlists.map(p => ({
        id: p.id,
        type: p.type || 'id',
        server: p.server || 'netease'
      }))
    }))
    .digest('hex');
}

/**
 * Load custom playlist data from content repo src/content/music/custom/*.yaml
 * Returns { [id]: { name, songs: [...] } }
 */
function loadCustomPlaylists() {
  try {
    if (!fs.existsSync(CUSTOM_PLAYLISTS_DIR)) return {};
    const yamlSync = require('js-yaml');
    const result = {};
    for (const f of fs.readdirSync(CUSTOM_PLAYLISTS_DIR).filter(x => x.endsWith('.yaml')).sort()) {
      const d = yamlSync.load(fs.readFileSync(path.join(CUSTOM_PLAYLISTS_DIR, f), 'utf8'));
      if (!d?.name) continue;
      const id = f.replace(/\.yaml$/, '');
      result[id] = {
        name: d.name,
        songs: (d.songs || []).map(s => ({
          title: s.title || 'Unknown',
          artist: s.artist || 'Unknown',
          cover: s.cover || '',
          url: s.url || '',
          lrc: s.lrc || '',
          duration: s.duration || ''
        }))
      };
    }
    return result;
  } catch {
    return {};
  }
}

async function fetchMusicDuration() {
  try {
    // --- Load config ---
    let config = {};
    try {
      const configStr = await fs.readFile(CONFIG_PATH, 'utf-8');
      config = yaml.load(configStr) || {};
    } catch (e) {
      log('Could not load config, using defaults');
    }

    const apiBase = (config?.music?.api || 'https://meting.mikus.ink/api').replace(/\/+$/, '');
    const playlists = config?.music?.playlists || [];

    if (playlists.length === 0) {
      playlists.push({ id: '8900628861', name: '默认歌单', server: 'netease' });
    }

    log(`🎵 ${playlists.length} playlist(s) configured`);
    log(`🔗 Music API: ${apiBase}`);

    // Progress mode header
    if (PROGRESS) {
      progressLog('🎵 音乐数据抓取中...');
      progressLog(`   🔗 API: ${apiBase}`);
      playlists.forEach(pl => {
        const sourceLabel = pl.type === 'custom' ? '自定义' : (pl.server || 'netease');
        progressLog(`   📋 歌单: ${pl.name || pl.id} (${sourceLabel})`);
      });
    }

    // --- Load existing data (for cache & fingerprint) ---
    let existingData = { songs: [], playlistCounts: {}, playlistSongs: {} };
    const urlToDuration = new Map();
    let existingUrlFingerprint = null;
    let existingConfigFingerprint = null;

    try {
      const raw = await fs.readFile(MUSIC_DATA_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        existingData = { songs: parsed, playlistCounts: {}, playlistSongs: {} };
      } else {
        existingData = parsed;
      }
      existingData.songs.forEach(s => {
        if (s.url && s.duration) urlToDuration.set(s.url, s.duration);
      });
      existingUrlFingerprint = existingData._urlFingerprint || null;
      existingConfigFingerprint = existingData._configFingerprint || null;
    } catch (e) { /* no existing data */ }

    // --- Load custom playlists from content repo ---
    const customPlaylists = loadCustomPlaylists();
    if (Object.keys(customPlaylists).length > 0) {
      log(`🎵 Custom playlists from content repo: ${Object.keys(customPlaylists).length} playlist(s)`);
      for (const [id, pl] of Object.entries(customPlaylists)) {
        if (!existingData.playlistSongs[id]) {
          existingData.playlistSongs[id] = pl.songs;
          log(`  ✅ Loaded custom playlist "${pl.name}": ${pl.songs.length} songs`);
        }
      }
    }

    // --- Config fingerprint check (fast, no API calls) ---
    // Include custom playlist IDs in config fingerprint so changes trigger re-prefetch
    const customIds = Object.keys(customPlaylists);
    const fpPlaylists = [
      ...playlists,
      ...customIds.map(id => ({ id, type: 'custom' }))
    ];
    const configFingerprint = computeConfigFingerprint(fpPlaylists, apiBase);

    // --- Fetch all playlists in parallel ---
    const playlistResults = await Promise.all(
      playlists.map(async (pl) => {
        let songs;
        if (pl.type === 'custom') {
          songs = existingData.playlistSongs?.[pl.id] || [];
          log(`  ✅ ${pl.name || pl.id} (自定义): ${songs.length} 首`);
        } else {
          const server = pl.server || 'netease';
          let fetchedSongs = await fetchPlaylistSongs(apiBase, pl.id, server);
          if (fetchedSongs === null) {
            log(`  ⚠️ Failed to fetch, using cached for ${pl.name || pl.id}`);
            songs = existingData.playlistSongs?.[pl.id] || [];
          } else {
            songs = fetchedSongs;
          }
          log(`  ✅ ${pl.name || pl.id} [${server}]: ${songs.length} 首`);
        }
        return { playlist: pl, songs };
      })
    );

    // --- Deduplicate & build data structures ---
    const playlistCounts = {};
    const playlistSongs = {};
    const allSongs = [];
    const seenUrls = new Set();
    const urlToSong = new Map();

    for (const { playlist, songs } of playlistResults) {
      playlistCounts[playlist.id] = songs.length;
      playlistSongs[playlist.id] = [];

      for (const song of songs) {
        if (!seenUrls.has(song.url)) {
          seenUrls.add(song.url);
          if (urlToDuration.has(song.url)) {
            song.duration = urlToDuration.get(song.url);
          }
          allSongs.push(song);
          urlToSong.set(song.url, song);
          playlistSongs[playlist.id].push(song);
        } else {
          playlistSongs[playlist.id].push(urlToSong.get(song.url));
        }
      }
    }

    // --- Lightweight URL fingerprint ---
    const urlFingerprint = computeUrlFingerprint(seenUrls);

    // --- Smart skip: config + URL set + playlist counts + all durations cached ---
    // playlistCounts catches: a playlist added/removed songs without URL change
    const playlistCountsChanged = JSON.stringify(playlistCounts) !== JSON.stringify(existingData.playlistCounts || {});
    if (
      configFingerprint === existingConfigFingerprint &&
      urlFingerprint === existingUrlFingerprint &&
      !playlistCountsChanged &&
      allSongs.every(s => !s.url || s.duration)
    ) {
      log('✅ Config, songs, and counts unchanged, all durations cached — skipping.');
      if (PROGRESS) progressLog('✅ 配置和歌曲无变化，所有时长已缓存，跳过抓取');
      return;
    }

    log(`📊 Total unique songs: ${allSongs.length}`);

    // Collect songs that need duration fetching
    const pending = allSongs.filter(s => s.url && !s.duration);
    const alreadyCached = allSongs.length - pending.length;

    log(`📊 Cached durations: ${alreadyCached}`);
    log(`📊 Need durations: ${pending.length}`);

    if (pending.length === 0) {
      log('✅ All durations already cached.');
      if (PROGRESS) progressLog(`✅ 共 ${allSongs.length} 首歌曲，时长已全部缓存`);
      const output = {
        songs: allSongs,
        playlistCounts,
        playlistSongs,
        _urlFingerprint: urlFingerprint,
        _configFingerprint: configFingerprint
      };
      await fs.writeFile(MUSIC_DATA_PATH, JSON.stringify(output, null, 4), 'utf-8');
      return;
    }

    // --- Concurrent duration fetching ---
    log(`🎵 Fetching ${pending.length} durations (${CONCURRENCY} concurrent, ${RETRIES} retries)...`);

    let index = 0;
    let success = 0;
    let failed = 0;
    let lastSave = 0;

    const output = {
      songs: allSongs,
      playlistCounts,
      playlistSongs,
      _urlFingerprint: urlFingerprint,
      _configFingerprint: configFingerprint
    };

    async function worker(workerId) {
      while (true) {
        const i = index;
        index++;
        if (i >= pending.length) break;

        const item = pending[i];
        const ok = await fetchDurationForSong(item);

        if (ok) {
          success++;
          const label = item.duration ? ` -> ${item.duration}` : ` -> ok`;
          if (VERBOSE || (!PROGRESS && !SILENT)) {
            log(`  [${workerId}]${label} (${success + failed}/${pending.length}) ${item.title}`);
          }
        } else {
          failed++;
          warn(`  [${workerId}] ❌ FAILED (${success + failed}/${pending.length}) ${item.title}`);
        }

        // Progress update (every 10 songs in --progress mode)
        if (PROGRESS && (success + failed) % 10 === 0) {
          progressLog(`  📊 进度: ${success + failed}/${pending.length} (成功: ${success}, 失败: ${failed})`);
        }

        // Incremental save
        if (success - lastSave >= SAVE_INTERVAL) {
          lastSave = success;
          try {
            await fs.writeFile(MUSIC_DATA_PATH, JSON.stringify(output, null, 4), 'utf-8');
            if (PROGRESS) {
              progressLog(`  💾 已保存 (${success} 首已获取)`);
            } else {
              log(`  💾 Saved (${success} resolved so far)`);
            }
          } catch (e) {
            console.error('  ⚠️  Save failed:', e.message);
          }
        }
      }
    }

    const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1));
    await Promise.all(workers);

    // Final save
    await fs.writeFile(MUSIC_DATA_PATH, JSON.stringify(output, null, 4), 'utf-8');

    log(`\n✅ Done. Resolved: ${success}, Failed: ${failed}, Total: ${allSongs.length}`);
    if (PROGRESS) progressLog(`✅ 音乐数据抓取完成: ${success} 成功, ${failed} 失败, 共 ${allSongs.length} 首`);
    if (failed > 0) {
      log(`⚠️  ${failed} songs could not get durations. Re-run to retry.`);
      if (PROGRESS) progressLog(`⚠️  ${failed} 首歌曲未能获取时长，可重新构建重试`);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

fetchMusicDuration();