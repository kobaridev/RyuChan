// 评论系统配置
import type { Config } from "@interfaces/site";
import * as fs from "node:fs";
import * as path from "node:path";
import yaml from "js-yaml";

// 配置文件路径
const configPath = path.resolve("ryuchan.config.yaml");
// 翻译文件路径
const translationsPath = path.resolve("src/i18n/translations.yaml");
// 读取并解析 YAML 文件
const config = yaml.load(fs.readFileSync(configPath, "utf8")) as Config;
// 读取并解析翻译文件
const translationsConfig = yaml.load(fs.readFileSync(translationsPath, "utf8")) as Record<string, any>;

// 网站基本信息
export const SITE_TAB = config.site.tab;
export const SITE_TITLE = config.site.title;
// 站点标题展示类型：'text' | 'image'（默认 text）
export const SITE_TITLE_TYPE = config.site.title_type || config.site.titleType || 'text';
// 可选的站点标题图片（现在保存在 user 下，便于与用户信息放在一起）
export const SITE_TITLE_IMAGE = config.user?.title_image || config.user?.titleImage || '';
export const SITE_DESCRIPTION = config.site.description;
export const SITE_LANGUAGE = config.site.language;
export const SITE_FAVICON = config.site.favicon || '/favicon.ico';
export const SITE_THEME = config.site.theme;
export const DATE_FORMAT = config.site.date_format;

// Banner 配置 - 使用安全访问  
export const BANNER_CONFIG = config.site.banner;
export const BANNER_IMAGES = config.site.banner?.images || [];
export const BANNER_HEIGHT = config.site.banner?.height || "60vh";
export const SITE_PAGES = config.site.pages || {};
// 在现有导出后添加  
export const TYPEWRITER_TEXTS = config.site.pages?.home?.typewriterTexts || [];

// 博客配置
export const BLOG_CONFIG = config.site.blog;
export const BLOG_PAGE_SIZE = config.site.blog.pageSize;

// TMDB 配置
export const TMDB_CONFIG = config.anime?.tmdb;

// Bilibili 配置
export const BILIBILI_CONFIG = config.anime?.bilibili;

// Anime 缓存配置
export const ANIME_CACHE_CONFIG = config.anime?.cache || {
  enable: true,
  ttl: 60
};

// GitHub 配置
export const GITHUB_CONFIG = config.github;

// 代码块的主题
export const CODE_THEME = config.site.theme.code;

// 用户个人信息
export const USER_NAME = config.user.name;
export const USER_DESCRIPTION = config.user.description;
export const USER_SITE = config.user.site;
export const USER_AVATAR = config.user.avatar;
export const USER_QR_WECHAT = config.user.qr_wechat || '/WeChat.jpg';
export const USER_QR_ALIPAY = config.user.qr_alipay || '/Alipay.jpg';

// 社交图标配置（侧边栏和页脚）
export const USER_SIDEBAR_SOCIAL_ICONS = config.user.sidebar.social;
export const USER_FOOTER_SOCIAL_ICONS = config.user.footer.social;

// 网站菜单项配置
export const SITE_MENU = config.site.menu;

// 备案信息
export const SITE_ICP = config.site.icp || "";
export const SITE_ICP_LINK = config.site.icp_link || "https://beian.miit.gov.cn/";

// 多语言文本配置
export const TRANSLATIONS = translationsConfig;

// 评论系统配置
export const commentsConfig = config.comments;

// Meting 配置
export const METING_CONFIG = config.site.meting || {
  server: 'netease',
  id: '8900628861',
  br: '320',
  trans: true
};

// 创建翻译缓存
const translationCache: Record<string, string> = {};

export function t(key: string): string {
  // 检查缓存中是否已存在此翻译
  if (translationCache[key] !== undefined) {
    return translationCache[key];
  }

  // 获取当前语言的翻译
  const currentLangTranslations = TRANSLATIONS[SITE_LANGUAGE];
  if (!currentLangTranslations) {
    translationCache[key] = key; // 缓存结果
    return key;
  }

  // 查找嵌套翻译
  const keyParts = key.split(".");
  let result = currentLangTranslations;

  for (let i = 0; i < keyParts.length; i++) {
    const part = keyParts[i];

    if (!result || typeof result !== "object") {
      translationCache[key] = key; // 缓存结果
      return key;
    }

    result = result[part];
  }

  // 保存结果到缓存
  translationCache[key] = typeof result === "string" ? result : key;
  return translationCache[key];
}

// Music 配置
export const MUSIC_CONFIG = config.music || {
  playlists: []
};

// Umami 配置接口
export interface UmamiConfig {
  enable: boolean;
  baseUrl: string;
  shareId: string;
  websiteId: string;
  timezone: string;
}

// Umami 配置实例（从配置文件读取）
export const umamiConfig: UmamiConfig = {
  enable: config.umami?.enable ?? false,
  baseUrl: config.umami?.baseUrl ?? "https://umami.acofork.com",
  shareId: config.umami?.shareId ?? "CdkXbGgZr6ECKOyK",
  websiteId: config.umami?.websiteId ?? "",
  timezone: config.umami?.timezone ?? "Asia/Shanghai",
};
