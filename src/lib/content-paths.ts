/**
 * 内容仓库（RyuChan-Content）路径常量
 * 集中管理所有在线编辑功能在内容仓库中的目标路径，
 * 避免各服务中出现散落的魔法字符串。
 */
export const CONTENT_PATHS = {
  /** 博客文章 */
  blogSrc: 'src/content/blog/src',
  /** 博客文章配图（上传后由 prebuild 同步到 public/images/） */
  blogImages: 'assets/images',
  /** 友链独立 YAML 文件 */
  friendsList: 'src/content/friends/list',
  /** 友链头像图片 */
  friendsAvatars: 'assets/images/friends',
  /** 导航分类独立 YAML 文件 */
  navigationCategories: 'src/content/navigation/categories',
  /** 导航图标图片 */
  navigationAvatars: 'assets/images/nav',
  /** 项目独立 YAML 文件 */
  projectSrc: 'src/content/project/src',
  /** 项目头像图片 */
  projectAvatars: 'assets/images/projects',
  /** 相册分类独立 YAML 文件 */
  albumCategories: 'src/content/album/categories',
  /** 相册图片 */
  albumImages: 'assets/albums',
  /** 关于页内容 */
  aboutSrc: 'src/content/about/src',
  /** 合成配置文件（内容仓库根目录） */
  config: 'ryuchan.config.yaml',
  /** 音乐数据 */
  music: 'src/data/music.json',
} as const