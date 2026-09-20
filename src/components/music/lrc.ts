import type { LyricLine, LyricWord } from "@applemusic-like-lyrics/core";

export interface AppleMusicSong {
  url: string;
  cover: string;
  title: string;
  artist: string;
  lrc?: string;
  album?: string;
  duration?: string;
}

export interface AppleMusicPlaylist {
  id: string;
  name: string;
}

function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function fuzzyMatchText(source: string, query: string): boolean {
  const normalizedSource = normalizeSearchText(source);
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  if (normalizedSource.includes(normalizedQuery)) return true;

  let sourceIndex = 0;
  for (const character of normalizedQuery.replace(/\s/g, "")) {
    sourceIndex = normalizedSource.indexOf(character, sourceIndex);
    if (sourceIndex === -1) return false;
    sourceIndex += 1;
  }
  return true;
}

/** 搜索歌曲标题或歌手，支持多关键词和字符顺序模糊匹配。 */
export function matchesSongQuery(song: AppleMusicSong, query: string): boolean {
  const keywords = normalizeSearchText(query).split(" ").filter(Boolean);
  if (keywords.length === 0) return true;
  const source = `${song.title} ${song.artist}`;
  return keywords.every((keyword) => fuzzyMatchText(source, keyword));
}

const timeTagRe = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
const metaRe = /^\[(ar|ti|al|by|offset|re|ve|au|length):(.*)\]$/i;

/** 从歌曲信息推断歌词地址（优先使用显式 lrc 字段） */
export function lyricsUrlOf(song: AppleMusicSong): string {
  if (song.lrc) return song.lrc;
  if (song.url) return song.url.replace(/\.[^/.]+$/, ".lrc");
  return "";
}

/**
 * 将封面转换为可用于 canvas/WebGL 纹理的地址。
 * 网易云封面带 `Access-Control-Allow-Origin: *`，可直接使用；
 * 但 QQ 音乐封面（y.gtimg.cn）不带 CORS 头，浏览器禁止将其上传到 WebGL 纹理，
 * 导致动态背景渲不出画面（纯黑）。这类封面改走带 CORS 的 images.weserv.nl 代理。
 */
function hostOfUrl(url: string): string {
  try {
    return new URL(url, globalThis.location?.href ?? "http://localhost").hostname;
  } catch {
    return "";
  }
}

/** 将 QQ 音乐封面 URL 的尺寸 token 放大（T002R300x300 → T003R800x800） */
export function highResCoverOf(url: string, size = 800): string {
  if (!url || !/(^|\.)y\.gtimg\.cn$/i.test(hostOfUrl(url))) return url;
  return url.replace(/(T\d{3}R)\d+x\d+(?=[^/]*$)/i, `$1${size}x${size}`);
}

export function coverForTexture(url: string): string {
  if (!url) return url;
  if (/(^|\.)y\.gtimg\.cn$/i.test(hostOfUrl(url))) {
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
  }
  return url;
}

/** 将 "mm:ss" 或 "hh:mm:ss" 格式时长转换为毫秒 */
export function durationMsOf(song: AppleMusicSong): number {
  if (!song.duration) return Number.NaN;
  const parts = song.duration.split(":");
  if (parts.length < 2) return Number.NaN;
  let total = 0;
  for (const part of parts) total = total * 60 + (Number.parseFloat(part) || 0);
  return total * 1000;
}

function padTime(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

/** 将一行歌词转换为单 token，触发 AMLL 的"整行高亮"（非逐字）渲染模式 */
function lineWords(text: string, startTime: number, endTime: number): LyricWord[] {
  const word = text.trim();
  if (!word) return [];
  return [{ startTime, endTime, word }];
}

/**
 * 将标准 LRC 文本解析为 AMLL 播放器所需的 LyricLine[]
 *
 * 每行歌词只包含唯一的 token（整行文本），因此 AMLL 会启用"非逐字"模式：
 * 正在播放的行整体高亮（变亮 + 变清晰），其他行淡化，配合 blur/scale 弹簧动画，
 * 呈现 Apple Music 原生整行歌词的效果（不逐字扫描）。
 */
export function parseLrcToLines(
  lrcText: string,
  songDurationMs = Number.NaN,
): LyricLine[] {
  let offsetMs = 0;
  const entries: { time: number; text: string }[] = [];

  for (const line of lrcText.split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean) continue;

    const meta = metaRe.exec(clean);
    if (meta) {
      const key = meta[1].toLowerCase();
      if (key === "offset") {
        offsetMs = Number.parseInt(meta[2], 10) || 0;
      }
      continue;
    }

    const times: number[] = [];
    timeTagRe.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = timeTagRe.exec(clean)) !== null) {
      const min = Number.parseInt(match[1], 10);
      const sec = Number.parseInt(match[2], 10);
      let ms = 0;
      if (match[3]) {
        ms =
          match[3].length === 2
            ? Number.parseInt(match[3], 10) * 10
            : match[3].length === 1
              ? Number.parseInt(match[3], 10) * 100
              : Number.parseInt(match[3], 10);
      }
      times.push(min * 60_000 + sec * 1000 + ms);
    }

    if (times.length === 0) continue;
    const text = clean.replace(timeTagRe, "").trim();
    for (const t of times) entries.push({ time: t, text });
  }

  entries.sort((a, b) => a.time - b.time);

  const hasDuration = Number.isFinite(songDurationMs) && songDurationMs > 0;
  const result: LyricLine[] = [];

  for (let i = 0; i < entries.length; i++) {
    const { time, text } = entries[i];
    const startTime = Math.max(0, time + offsetMs);
    const nextTime = i < entries.length - 1 ? entries[i + 1].time : startTime + 5000;
    let endTime = hasDuration ? Math.min(nextTime, songDurationMs) : nextTime;
    endTime = Math.max(endTime, startTime + 100);

    const words = lineWords(text, startTime, endTime);
    if (words.length === 0) continue;

    // 整行歌词：保持原文，附加译文/拼音字段留空
    result.push({
      words,
      translatedLyric: "",
      romanLyric: "",
      startTime,
      endTime,
      isBG: false,
      isDuet: false,
    });
  }

  return result;
}

/** 拉取并解析一首歌的 LRC 歌词；无歌词返回 null */
export async function fetchLyricLines(
  song: AppleMusicSong,
  signal?: AbortSignal,
): Promise<LyricLine[] | null> {
  const url = lyricsUrlOf(song);
  if (!url) return null;

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = parseLrcToLines(text, durationMsOf(song));
    return lines.length > 0 ? lines : null;
  } catch (err) {
    if ((err as Error).name === "AbortError") return null;
    return null;
  }
}

export { padTime };