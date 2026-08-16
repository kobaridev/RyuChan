/**
 * 内容仓模块配置合成/分解工具
 *
 * 内容仓库（RyuChan-Content）的配置分散在各模块的 config.yaml 中：
 *   src/content/site/config.yaml, blog/config.yaml, footer/config.yaml, ...
 *
 * 前端 ConfigPage 需要的是合成后的 ryuchan.config.yaml 格式。
 * 本模块负责：
 *   1. 从内容仓读取各模块 config.yaml → 合成为 ryuchan.config.yaml 格式
 *   2. 将 ryuchan.config.yaml 格式的配置 → 分解写回各模块 config.yaml
 */
import { readTextFileFromRepo, createBlob, toBase64Utf8, type TreeItem } from '@/lib/github-client'
import { GITHUB_CONFIG } from '@/consts'
import yaml from 'js-yaml'

// ---- 各模块 config.yaml 在内容仓中的路径 ----
const MODULE_PATHS = {
  site:     'src/content/site/config.yaml',
  blog:     'src/content/blog/config.yaml',
  footer:   'src/content/footer/config.yaml',
  friends:  'src/content/friends/config.yaml',
  about:    'src/content/about/config.yaml',
  navigation: 'src/content/navigation/config.yaml',
  project:  'src/content/project/config.yaml',
  album:    'src/content/album/config.yaml',
  music:    'src/content/music/config.yaml',
  anime:    'src/content/anime/config.yaml',
  comments: 'src/content/comments/config.yaml',
  github:   'src/content/github/config.yaml',
  analysis: 'src/content/analysis/config.yaml',
} as const

type ModuleConfigs = Record<string, Record<string, unknown>>

// ---- 读取 ----

/**
 * 从内容仓读取所有模块 config.yaml 并解析为对象
 */
async function loadAllModuleConfigs(token: string | undefined): Promise<ModuleConfigs> {
  const configs: ModuleConfigs = {}
  for (const [key, path] of Object.entries(MODULE_PATHS)) {
    try {
      const raw = await readTextFileFromRepo(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, path, GITHUB_CONFIG.BRANCH)
      if (raw) {
        configs[key] = (yaml.load(raw) as Record<string, unknown>) || {}
      }
    } catch {
      // 模块不存在则跳过
    }
  }
  return configs
}

function sub(cfg: Record<string, unknown> | undefined): string {
  return (cfg?.subtitle as string) || (cfg?.description as string) || ''
}

/**
 * 从各模块 config 合成 ryuchan.config.yaml 格式的对象
 * 逻辑与 prebuild-content.mjs 保持一致
 */
export async function synthesizeConfig(token: string | undefined): Promise<Record<string, unknown>> {
  const cfg = await loadAllModuleConfigs(token)

  const siteBase = ((cfg.site as any)?.site || {}) as Record<string, unknown>

  const result: Record<string, unknown> = {}

  // --- site ---
  result.site = {
    ...siteBase,
    titleType: siteBase.title_type || 'text',
    pages: {
      home: {
        title: (cfg.blog as any)?.title || siteBase.title || 'RyuChan',
        subtitle: sub(cfg.blog as any),
        typewriterTexts: (cfg.blog as any)?.typewriterTexts || [],
      },
      friend:     { title: (cfg.friends as any)?.title || 'friends', subtitle: sub(cfg.friends as any) },
      about:      { title: (cfg.about as any)?.page?.title || (cfg.about as any)?.title || 'About Me', subtitle: (cfg.about as any)?.page?.subtitle || sub(cfg.about as any) },
      navigation: { title: (cfg.navigation as any)?.title || 'Navigation', subtitle: sub(cfg.navigation as any) },
      anime:      { title: (cfg.anime as any)?.title || 'anime', subtitle: sub(cfg.anime as any) },
      project:    { title: (cfg.project as any)?.title || 'Project', subtitle: sub(cfg.project as any) },
      album:      { title: (cfg.album as any)?.title || 'Album', subtitle: sub(cfg.album as any) },
      music:      { title: (cfg.music as any)?.title || 'Player', subtitle: sub(cfg.music as any) },
    },
    menu: siteBase.menu || [],
    blog: { pageSize: (cfg.blog as any)?.pageSize || 8 },
    icp: (cfg.footer as any)?.icp || '',
    icp_link: (cfg.footer as any)?.icp_link || '',
  }

  // --- user ---
  const userCfg = (cfg.site as any)?.user || {}
  result.user = {
    ...userCfg,
    title_image: userCfg.title_image ?? siteBase.title_image ?? '',
    sidebar: { social: userCfg.sidebar?.social || [] },
    footer: { social: (cfg.footer as any)?.social || [] },
  }

  // --- github ---
  result.github = cfg.github || {}

  // --- umami (from analysis) ---
  const analysisEnabled = (cfg.analysis as any)?.enable ?? false
  result.umami = { enable: analysisEnabled }

  // --- comments ---
  result.comments = {
    enable: (cfg.comments as any)?.enable ?? false,
    type: (cfg.comments as any)?.provider || 'twikoo',
  }

  // --- music ---
  result.music = {
    api: (cfg.music as any)?.api || 'https://meting.mikus.ink/api',
    playlists: [],
  }

  // --- anime ---
  result.anime = {}

  return result
}

// ---- 写入 ----

/**
 * 将 ryuchan.config.yaml 格式的配置分解并写回内容仓各模块 config.yaml
 */
/**
 * 将 ryuchan.config.yaml 格式的配置分解为各模块 config.yaml 的 tree items
 * 不执行 commit，由调用方统一处理图片/音乐后一起提交
 */
export async function buildConfigTreeItems(config: Record<string, unknown>): Promise<TreeItem[]> {
  const { getAuthToken } = await import('@/lib/auth')
  const authToken = await getAuthToken()

  const treeItems: TreeItem[] = []
  const siteCfg = (config.site || {}) as Record<string, unknown>
  const userCfg = (config.user || {}) as Record<string, unknown>

  // 1. site/config.yaml — 站点配置 + 用户信息
  const siteModule: Record<string, unknown> = {
    site: {
      tab: siteCfg.tab,
      title: siteCfg.title,
      title_type: siteCfg.title_type || siteCfg.titleType,
      title_image: siteCfg.title_image,
      description: siteCfg.description,
      language: siteCfg.language,
      favicon: siteCfg.favicon,
      theme: siteCfg.theme,
      date_format: siteCfg.date_format,
      banner: siteCfg.banner,
      menu: siteCfg.menu,
    },
    user: {
      name: userCfg.name,
      description: userCfg.description,
      site: userCfg.site,
      avatar: userCfg.avatar,
      qr_wechat: userCfg.qr_wechat,
      qr_alipay: userCfg.qr_alipay,
      sidebar: userCfg.sidebar,
    },
  }
  addModuleTreeItem(treeItems, 'site', siteModule, authToken)

  // 2. blog/config.yaml
  const pages = (siteCfg.pages || {}) as Record<string, unknown>
  const home = (pages.home || {}) as Record<string, unknown>
  const blogModule = {
    title: home.title,
    pageSize: (siteCfg.blog as any)?.pageSize || 8,
    subtitle: home.subtitle,
    typewriterTexts: home.typewriterTexts,
  }
  addModuleTreeItem(treeItems, 'blog', blogModule, authToken)

  // 3. footer/config.yaml
  const footerModule = {
    social: (userCfg.footer as any)?.social || [],
    icp: siteCfg.icp,
    icp_link: siteCfg.icp_link,
  }
  addModuleTreeItem(treeItems, 'footer', footerModule, authToken)

  // 4. friends/config.yaml
  const friendPage = (pages.friend || {}) as Record<string, unknown>
  addModuleTreeItem(treeItems, 'friends', { title: friendPage.title, subtitle: friendPage.subtitle }, authToken)

  // 5. about/config.yaml — 保留原有非 page 字段
  const aboutExisting = await loadModuleConfig(authToken, 'about')
  const aboutPage = (pages.about || {}) as Record<string, unknown>
  const aboutModule = { ...aboutExisting, page: { title: aboutPage.title, subtitle: aboutPage.subtitle } }
  addModuleTreeItem(treeItems, 'about', aboutModule, authToken)

  // 6. navigation/config.yaml
  const navPage = (pages.navigation || {}) as Record<string, unknown>
  addModuleTreeItem(treeItems, 'navigation', { title: navPage.title, subtitle: navPage.subtitle }, authToken)

  // 7. project/config.yaml
  const projPage = (pages.project || {}) as Record<string, unknown>
  addModuleTreeItem(treeItems, 'project', { title: projPage.title, subtitle: projPage.subtitle }, authToken)

  // 8. album/config.yaml
  const albumPage = (pages.album || {}) as Record<string, unknown>
  addModuleTreeItem(treeItems, 'album', { title: albumPage.title, subtitle: albumPage.subtitle }, authToken)

  // 9. music/config.yaml
  const musicPage = (pages.music || {}) as Record<string, unknown>
  const musicCfg = (config.music || {}) as Record<string, unknown>
  const musicExisting = await loadModuleConfig(authToken, 'music')
  addModuleTreeItem(treeItems, 'music', { ...musicExisting, title: musicPage.title, api: musicCfg.api, subtitle: musicPage.subtitle }, authToken)

  // 10. anime/config.yaml
  const animePage = (pages.anime || {}) as Record<string, unknown>
  const animeExisting = await loadModuleConfig(authToken, 'anime')
  addModuleTreeItem(treeItems, 'anime', { ...animeExisting, title: animePage.title, subtitle: animePage.subtitle }, authToken)

  // 11. comments/config.yaml
  const commentsCfg = (config.comments || {}) as Record<string, unknown>
  const commentsExisting = await loadModuleConfig(authToken, 'comments')
  addModuleTreeItem(treeItems, 'comments', { ...commentsExisting, enable: commentsCfg.enable, provider: commentsCfg.type }, authToken)

  // 12. github/config.yaml
  const githubCfg = (config.github || {}) as Record<string, unknown>
  const githubExisting = await loadModuleConfig(authToken, 'github')
  addModuleTreeItem(treeItems, 'github', { ...githubExisting, ...githubCfg }, authToken)

  // 13. analysis/config.yaml
  const umamiCfg = (config.umami || {}) as Record<string, unknown>
  const analysisExisting = await loadModuleConfig(authToken, 'analysis')
  const providers = umamiCfg.enable ? ['umami-head', 'claity'] : []
  addModuleTreeItem(treeItems, 'analysis', { ...analysisExisting, enable: !!umamiCfg.enable, provider: providers }, authToken)

  return treeItems
}

// ---- helpers ----

async function loadModuleConfig(token: string, module: string): Promise<Record<string, unknown>> {
  const path = MODULE_PATHS[module as keyof typeof MODULE_PATHS]
  if (!path) return {}
  try {
    const raw = await readTextFileFromRepo(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, path, GITHUB_CONFIG.BRANCH)
    if (raw) return (yaml.load(raw) as Record<string, unknown>) || {}
  } catch { /* ignore */ }
  return {}
}

async function addModuleTreeItem(treeItems: TreeItem[], module: string, data: Record<string, unknown>, token: string) {
  const path = MODULE_PATHS[module as keyof typeof MODULE_PATHS]
  if (!path) return
  const content = yaml.dump(data, { lineWidth: -1, noRefs: true })
  const base64 = toBase64Utf8(content)
  const { sha } = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, base64, 'base64')
  treeItems.push({ path, mode: '100644', type: 'blob', sha })
}