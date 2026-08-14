/**
 * prebuild-content.mjs
 *
 * 构建前将内容仓同步到前端仓，生成兼容原格式的 ryuchan.config.yaml 和 src/data/*。
 * 前端 src/config.ts 无需改动。
 *
 * 内容仓获取优先级：
 *   1. 环境变量 CONTENT_REPO（本地开发时指定绝对路径，最快）
 *   2. 本地相对路径 ../ryuchan-content
 *   3. 从 GitHub clone（支持私有仓，需要 PUBLIC_CONTENT_TOKEN 或 GITHUB_TOKEN）
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const ROOT = process.cwd();

// 内容仓本地路径（由 clone 或环境变量决定）
let CONTENT_REPO = process.env.CONTENT_REPO;

function log(msg) { console.log(`[prebuild] ${msg}`); }

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  ensureDir(dst);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// ---- 0. 确保内容仓存在（本地路径 或 GitHub clone）----
if (!CONTENT_REPO) {
  const localPath = path.resolve(ROOT, '../ryuchan-content');
  if (fs.existsSync(localPath)) {
    CONTENT_REPO = localPath;
  } else {
    // 尝试从 GitHub clone
    const OWNER = process.env.PUBLIC_CONTENT_REPO_OWNER || 'kobaridev';
    const REPO  = process.env.PUBLIC_CONTENT_REPO || 'RyuChan-Content';
    const BRANCH = process.env.PUBLIC_CONTENT_REPO_BRANCH || 'main';
    const CLONE_URL = process.env.PUBLIC_CONTENT_REPO_URL || `https://github.com/${OWNER}/${REPO}.git`;

    // 获取凭据：优先 PUBLIC_CONTENT_TOKEN，其次 GITHUB_TOKEN（CI 环境）
    const TOKEN = process.env.PUBLIC_CONTENT_TOKEN || process.env.GITHUB_TOKEN || '';
    const CRED_URL = TOKEN
      ? `https://${TOKEN}@github.com/${OWNER}/${REPO}.git`
      : CLONE_URL;

    CONTENT_REPO = path.resolve(ROOT, 'node_modules/.cache/ryuchan-content');
    if (!fs.existsSync(CONTENT_REPO)) {
      log(`clone 内容仓: ${CLONE_URL} → ${CONTENT_REPO}`);
      ensureDir(path.dirname(CONTENT_REPO));
      try {
        execSync(`git clone --depth 1 --branch ${BRANCH} "${CRED_URL}" "${CONTENT_REPO}"`, {
          stdio: 'inherit',
          env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
        });
      } catch (e) {
        log('clone 失败，检查凭据或网络连接');
        process.exit(1);
      }
    } else {
      log(`内容仓缓存已存在: ${CONTENT_REPO}`);
    }
  }
}

const SRC_CONTENT = path.resolve(CONTENT_REPO, 'src/content');
const ASSETS = path.resolve(CONTENT_REPO, 'assets');

// ---- 1. 验证内容仓 ----
if (!fs.existsSync(SRC_CONTENT)) {
  log(`内容仓不存在: ${CONTENT_REPO}`);
  log('跳过同步');
  process.exit(0);
}
log(`内容仓: ${CONTENT_REPO}`);

// ---- 2. 加载内容仓各模块 ----
function loadModule(mod) {
  const p = path.resolve(SRC_CONTENT, mod, 'config.yaml');
  return fs.existsSync(p) ? yaml.load(fs.readFileSync(p, 'utf8')) : null;
}

function loadProvider(rel) {
  const p = path.resolve(SRC_CONTENT, rel);
  return fs.existsSync(p) ? yaml.load(fs.readFileSync(p, 'utf8')) : null;
}

// 兼容 subtitle / subitle 两种拼写
function subtitleOf(mod) {
  return mod?.subtitle ?? mod?.subitle ?? '';
}

// site/config.yaml 现在是 { site: {...}, user: {...} } 两段结构
const siteModule = loadModule('site') || {};

const cfg = {
  site:    siteModule.site || {},
  user:    siteModule.user || {},
  footer:  loadModule('footer'),
  github:  loadModule('github'),
  blog:    loadModule('blog'),
  album:   loadModule('album'),
  friends: loadModule('friends'),
  project: loadModule('project'),
  navigation: loadModule('navigation'),
  anime:   loadModule('anime'),
  music:   loadModule('music'),
  comments: loadModule('comments'),
  analysis: loadModule('analysis'),
  about:   loadModule('about'),
};

// ---- 3. 合成 ryuchan.config.yaml（兼容原格式）----
const existing = fs.existsSync(path.resolve(ROOT, 'ryuchan.config.yaml'))
  ? yaml.load(fs.readFileSync(path.resolve(ROOT, 'ryuchan.config.yaml'), 'utf8')) || {}
  : {};

const newConfig = {};

// site: 内容仓 site 段 + 从各模块推导 pages/menu/blog/icp
const siteBase = cfg.site;

newConfig.site = {
  ...siteBase,
  // titleType: 前端 config.ts 的历史兼容键，与 title_type 保持同值
  titleType: siteBase.title_type || 'text',
  // pages: 从各模块 config 推导
  pages: {
    home: {
      title: cfg.blog?.title || siteBase.title || 'RyuChan',
      subtitle: subtitleOf(cfg.blog),
      typewriterTexts: cfg.blog?.typewriterTexts || [],
    },
    friend: { title: cfg.friends?.title || 'friends', subtitle: subtitleOf(cfg.friends) },
    about:  {
      title: cfg.about?.page?.title || cfg.about?.title || 'About Me',
      subtitle: cfg.about?.page?.subtitle || subtitleOf(cfg.about),
    },
    navigation: { title: cfg.navigation?.title || 'Navigation', subtitle: subtitleOf(cfg.navigation) },
    anime:  { title: cfg.anime?.title || 'anime', subtitle: subtitleOf(cfg.anime) },
    project:{ title: cfg.project?.title || 'Project', subtitle: subtitleOf(cfg.project) },
    album:  { title: cfg.album?.title || 'Album', subtitle: subtitleOf(cfg.album) },
    music:  { title: cfg.music?.title || 'Player', subtitle: subtitleOf(cfg.music) },
  },
  // menu: 内容仓 site.menu 优先，缺失时保留前端仓原值
  menu: siteBase.menu || existing.site?.menu || [],
  // blog.pageSize: 从 blog 模块读取
  blog: { pageSize: cfg.blog?.pageSize || 8 },
  // icp/icp_link 从 footer 模块读取
  icp: cfg.footer?.icp || '',
  icp_link: cfg.footer?.icp_link || '',
};

// user: 内容仓 user 段 + footer 模块的社交链接
// title_image 在内容仓归属 site（与 title_type 成对），但前端 config.ts 读的是
// config.user.title_image，这里回填保持兼容
newConfig.user = {
  ...cfg.user,
  title_image: cfg.user.title_image ?? siteBase.title_image ?? '',
  sidebar: { social: cfg.user.sidebar?.social || [] },
  footer: { social: cfg.footer?.social || [] },
};

// github / umami / comments / music / anime
newConfig.github = cfg.github || existing.github || {};

// umami: 配置来自 analysis/provider/umami-head.yaml，enable 受 analysis/config.yaml 控制
const umamiProvider = loadProvider('analysis/provider/umami-head.yaml');
const analysisEnabled = cfg.analysis?.enable ?? false;
const umamiInProviders = (cfg.analysis?.provider || []).some(p => String(p).startsWith('umami'));
newConfig.umami = umamiProvider
  ? { ...umamiProvider, enable: analysisEnabled && umamiInProviders && (umamiProvider.enable ?? true) }
  : (existing.umami || { enable: false });

newConfig.comments = {
  enable: cfg.comments?.enable ?? existing.comments?.enable ?? false,
  type: cfg.comments?.provider || existing.comments?.type || 'twikoo',
  twikoo: loadProvider('comments/provider/twikoo.yaml') || existing.comments?.twikoo || {},
  waline: loadProvider('comments/provider/waline.yaml') || existing.comments?.waline || {},
  giscus: loadProvider('comments/provider/giscus.yaml') || existing.comments?.giscus || {},
};

newConfig.music = {
  api: cfg.music?.api || existing.music?.api || 'https://meting.mikus.ink/api',
  playlists: (() => {
    const listDir = path.resolve(SRC_CONTENT, 'music/list');
    if (!fs.existsSync(listDir)) return existing.music?.playlists || [];
    return fs.readdirSync(listDir)
      .filter(f => f.endsWith('.yaml'))
      .sort()
      .map(f => {
        const d = yaml.load(fs.readFileSync(path.join(listDir, f), 'utf8'));
        const song = d.songs?.[0] || {};
        // id 取歌单实际 index（不是文件名），server 取 provider
        const entry = { id: String(song.index ?? ''), name: d.name, server: song.provider || 'netease' };
        if (song.provider === 'custom') {
          entry.type = 'custom';
          delete entry.server;
        }
        return entry;
      });
  })(),
};
newConfig.anime = {
  bilibili: loadProvider('anime/provider/bilibili.yaml') || existing.anime?.bilibili || {},
  tmdb: loadProvider('anime/provider/tmdb.yaml') || existing.anime?.tmdb || {},
};

const outPath = path.resolve(ROOT, 'ryuchan.config.yaml');
// noRefs: 避免 YAML 输出 &ref_0 / *ref_0 锚点（sidebar 与 footer 引用同一数组时会产生）
fs.writeFileSync(outPath, yaml.dump(newConfig, { lineWidth: -1, quotingType: '"', forceQuotes: false, noRefs: true }));
log(`ryuchan.config.yaml 已生成`);

// ---- 4. 同步文章和 about 页面 ----
const blogSrc = path.resolve(SRC_CONTENT, 'blog/src');
const blogDst = path.resolve(ROOT, 'src/content/blog');
if (fs.existsSync(blogSrc)) {
  // 清理旧文章再复制
  if (fs.existsSync(blogDst)) fs.rmSync(blogDst, { recursive: true });
  copyDir(blogSrc, blogDst);
  log(`文章同步: ${blogDst}`);
}

// 同步 about 页面内容（注入 title 到 frontmatter）
const aboutSrc = path.resolve(SRC_CONTENT, 'about/src');
const aboutDst = path.resolve(ROOT, 'src/content/about');
if (fs.existsSync(aboutSrc)) {
  if (fs.existsSync(aboutDst)) fs.rmSync(aboutDst, { recursive: true });
  copyDir(aboutSrc, aboutDst);

  // 注入 title 到 index.md 的 frontmatter（内容仓的 about 页面无 frontmatter，title 在 config.yaml 中）
  const aboutIndex = path.resolve(aboutDst, 'index.md');
  if (fs.existsSync(aboutIndex)) {
    const title = cfg.about?.page?.title || cfg.about?.title || 'About Me';
    const content = fs.readFileSync(aboutIndex, 'utf8');
    const frontmatter = `---\ntitle: "${title}"\n---\n`;
    fs.writeFileSync(aboutIndex, frontmatter + content);
  }

  log(`关于页同步: ${aboutDst}`);
}

// 同步 about 配置到前端 env（可选：暴露到前端环境变量）
const aboutConfigSrc = path.resolve(SRC_CONTENT, 'about/config.yaml');
const aboutConfigDst = path.resolve(ROOT, 'src/data/about-config.js');
if (fs.existsSync(aboutConfigSrc)) {
  ensureDir(path.dirname(aboutConfigDst));
  const config = yaml.load(fs.readFileSync(aboutConfigSrc, 'utf8'));
  // Generate JS module export for Astro import
  const jsContent = `export default ${JSON.stringify(config, null, 2).replace(/"/g, "'")}
`;
  fs.writeFileSync(aboutConfigDst, jsContent, 'utf8');
  log(`关于页配置同步: src/data/about-config.js`);
}

// ---- 5. 合成 src/data/* ----
function mergeYaml(srcDir, outFile) {
  if (!fs.existsSync(srcDir)) return;
  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.yaml')).sort();
  const items = files.map(f => yaml.load(fs.readFileSync(path.join(srcDir, f), 'utf8')));
  ensureDir(path.dirname(outFile));
  fs.writeFileSync(outFile, yaml.dump(items, { lineWidth: -1, quotingType: '"', forceQuotes: false }));
  log(`合成 ${path.relative(ROOT, outFile)}: ${files.length} 条`);
}

mergeYaml(path.resolve(SRC_CONTENT, 'friends/list'), path.resolve(ROOT, 'src/data/friends.yaml'));
mergeYaml(path.resolve(SRC_CONTENT, 'project/src'), path.resolve(ROOT, 'src/data/projects.yaml'));

// navigation.yaml: 内容仓 { category, icon, navigations } → 前端 { title, icon, items }
const navDir = path.resolve(SRC_CONTENT, 'navigation/categories');
if (fs.existsSync(navDir)) {
  const files = fs.readdirSync(navDir).filter(f => f.endsWith('.yaml')).sort();
  const items = files.map(f => {
    const d = yaml.load(fs.readFileSync(path.join(navDir, f), 'utf8'));
    return { title: d.category, icon: d.icon || '', items: d.navigations || [] };
  });
  ensureDir(path.resolve(ROOT, 'src/data'));
  fs.writeFileSync(
    path.resolve(ROOT, 'src/data/navigation.yaml'),
    yaml.dump(items, { lineWidth: -1, quotingType: '"', forceQuotes: false, noRefs: true })
  );
  log(`合成 src/data/navigation.yaml: ${files.length} 个分组`);
}

// albums.json: 保留内容仓里的 id / event 字段
const albumDir = path.resolve(SRC_CONTENT, 'album/categories');
if (fs.existsSync(albumDir)) {
  const files = fs.readdirSync(albumDir).filter(f => f.endsWith('.yaml')).sort();
  const items = files.map(f => {
    const d = yaml.load(fs.readFileSync(path.join(albumDir, f), 'utf8'));
    return {
      id: d.id || f.replace('.yaml', ''),
      date: d.date,
      event: d.event || d.title,
      title: d.title,
      description: d.description || '',
      icon: d.icon || '',
      photos: d.photos || [],
    };
  });
  ensureDir(path.resolve(ROOT, 'src/data'));
  fs.writeFileSync(path.resolve(ROOT, 'src/data/albums.json'), JSON.stringify(items, null, 2));
  log(`合成 src/data/albums.json: ${files.length} 个`);
}

// ---- 6. 同步 assets ----
copyDir(path.resolve(ASSETS, 'media'), path.resolve(ROOT, 'public/image'));
log('配图同步: assets/media → public/image');

// brand 展开到 public/ 根（含 qrcode/ 等子目录里的文件，也一并平铺到根）
// 这样配置里的 /logo.png、/WeChat.jpg 等绝对路径无需改动
const brandSrc = path.resolve(ASSETS, 'brand');
const publicDst = path.resolve(ROOT, 'public');
if (fs.existsSync(brandSrc)) {
  let count = 0;
  const flatten = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const s = path.join(dir, entry.name);
      if (entry.isDirectory()) flatten(s);
      else { ensureDir(publicDst); fs.copyFileSync(s, path.join(publicDst, entry.name)); count++; }
    }
  };
  flatten(brandSrc);
  log(`品牌资源同步: assets/brand → public/（展开 ${count} 个文件到根）`);
}

log('同步完成');
