// 评论系统配置类型
export interface GiscusConfig {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping?: string;
  lang?: string;
  inputPosition?: string;
  reactionsEnabled?: string;
  emitMetadata?: string;
  loading?: string;
}

export interface WalineConfig {
  serverURL: string;
  lang?: string;
  emoji?: string[];
  meta?: string[];
  requiredMeta?: string[];
  reaction?: boolean;
  pageview?: boolean;
}

export interface CommentsConfig {
  enable: boolean;
  type: 'giscus' | 'waline' | 'none';
  giscus?: GiscusConfig;
  waline?: WalineConfig;
}
export interface SubMenuItem {
  id: string;
  text: string;
  href: string;
  svg: string;
  target: string;
}

export interface MenuItem {
  id: string;
  text: string;
  href: string;
  svg: string;
  target: string;
  subItems?: SubMenuItem[];
}

export interface PageConfig {
  title: string;
  subtitle: string;
  typewriterTexts?: string[]; // 新增打字机文本配置  
}

export interface SocialIcon {
  href: string;
  ariaLabel: string;
  title: string;
  svg: string;
}

export interface BlogConfig {
  pageSize: number;
}

export interface TmdbConfig {
  apiKey: string;
  listId: string;
}

export interface BilibiliConfig {
  uid: string;
}

export interface GithubConfig {
  owner: string;
  repo: string;
  branch: string;
  appId: string;
  encryptKey: string;
}

export interface SiteConfig {
  tab: string;
  title: string;
  description: string;
  language: string;
  favicon: string;
  theme: {
    light: string;
    dark: string;
    code: string;
  };
  date_format: string;
  blog: BlogConfig;
  menu: MenuItem[];
  banner?: {
    images: string[];
    height: string;
    enableRandom?: boolean;
    randomUrl?: string;
    randomCount?: number;
  };
  pages?: {
    [key: string]: PageConfig;
  };
  icp?: string;
  icp_link?: string;
}

export interface UserConfig {
  name: string;
  description?: string;
  site: string;
  avatar: string;
  sidebar: {
    social: SocialIcon[];
  };
  footer: {
    social: SocialIcon[];
  };
}

export interface TranslationLabel {
  noTag: string;
  tagCard: string;
  tagPage: string;
  totalTags: string;
  noCategory: string;
  categoryCard: string;
  categoryPage: string;
  totalCategories: string;
  noPosts: string;
  archivePage: string;
  totalPosts: string;
  link: string;
  prevPage: string;
  nextPage: string;
  wordCount: string;
  readTime: string;
  share: string;
  shareCard: string;
  close: string;
  learnMore: string;
  allTags: string;
  allCategories: string;
  post: string;
  posts: string;
  tagDescription: string;
  categoryDescription: string;
  tagsPageDescription: string;
  categoriesPageDescription: string;
  archivesPageDescription: string;
  backToBlog: string;
}

export interface LanguageTranslation {
  label: TranslationLabel;
}

export interface Translations {
  [language: string]: LanguageTranslation;
}

export interface AnimeConfig {
  bilibili?: BilibiliConfig;
  tmdb?: TmdbConfig;
}

import type { UmamiConfig } from "../config";
export interface Config {
  site: SiteConfig;
  user: UserConfig;
  umami?: UmamiConfig;
  comments?: CommentsConfig;
  anime?: AnimeConfig;
  github?: GithubConfig;
}