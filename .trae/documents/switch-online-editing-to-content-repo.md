# 将在线编辑功能上游仓库改为内容仓库

## Context

当前 RyuChan 前端项目的在线编辑功能（/write 写文章、/config 站点配置、友链/导航/项目/相册编辑等）通过 GitHub API 直接写入前端仓库（RyuChan）。现在需要将这些写入操作改为指向内容仓库（RyuChan-Content），使内容仓库成为唯一的数据源。前端仓库通过 `prebuild-content.mjs` 脚本从内容仓库同步内容后构建。

### 数据流变化

```
之前: 在线编辑 → RyuChan（前端仓） → GitHub Actions 构建 → 部署
现在: 在线编辑 → RyuChan-Content（内容仓） → prebuild-content.mjs → RyuChan（前端仓） → 部署
```

### 核心挑战

内容仓库的文件结构与前端仓库有显著差异：
- **博客文章**: 前端 `src/content/blog/` → 内容 `src/content/blog/src/`
- **友链/导航/项目**: 前端是单个合并文件 → 内容是多个独立 YAML 文件
- **配置**: 前端是合成文件 `ryuchan.config.yaml` → 内容是各模块独立 `config.yaml`
- **图片**: 前端 `public/images/` → 内容 `assets/images/`（新增目录）

---

## 实施计划

### Step 1: 创建路径常量模块

**新建文件**: `src/lib/content-paths.ts`

集中管理内容仓库中所有内容的路径映射，避免各服务中出现散落的魔法字符串。

```typescript
export const CONTENT_PATHS = {
  blogSrc: 'src/content/blog/src',
  blogImages: 'assets/images',
  friendsList: 'src/content/friends/list',
  navigationCategories: 'src/content/navigation/categories',
  projectSrc: 'src/content/project/src',
  albumCategories: 'src/content/album/categories',
  albumImages: 'assets/albums',
  aboutSrc: 'src/content/about/src',
  config: 'ryuchan.config.yaml',
  music: 'src/data/music.json',
} as const
```

### Step 2: 更新 `src/consts.ts` — 修改默认仓库

将 `GITHUB_CONFIG.REPO` 的默认值从 `'RyuChan'` 改为 `'RyuChan-Content'`。

同时添加 `FRONTEND_REPO` 常量，用于 about-edit 等仍需写入前端仓库的功能：

```typescript
export const FRONTEND_REPO = import.meta.env.PUBLIC_FRONTEND_REPO || 'RyuChan'
```

### Step 3: 更新 `.env.example` 和 `.env`

修改 `PUBLIC_GITHUB_REPO` 默认值为 `RyuChan-Content`。

### Step 4: 创建独立文件 CRUD 共享工具

**新建文件**: `src/lib/individual-files.ts`

友链、导航、项目三个服务都需要"删除所有旧文件 + 写入新文件"的模式。创建共享函数 `replaceIndividualFiles`：

```typescript
export async function replaceIndividualFiles<T>(
  token: string, dirPath: string, items: T[],
  serializer?: (item: T, index: number) => Record<string, unknown>
): Promise<TreeItem[]>
```

该函数会：
1. 列出目标目录下所有 `.yaml` 文件
2. 为每个旧文件添加 `sha: null` 的删除条目
3. 为每个新 item 创建 `01.yaml`, `02.yaml`, ... 的新文件条目

### Step 5: 更新博客服务（push-blog, delete-blog, batch-delete, load-blog）

**文件**: 
- `src/components/write/services/push-blog.ts`
- `src/components/write/services/delete-blog.ts`
- `src/components/write/services/batch-delete.ts`
- `src/lib/load-blog.ts`

路径变更：
- 博客文章: `src/content/blog/{slug}.{ext}` → `src/content/blog/src/{slug}.{ext}`
- 博客图片: `public/images/{slug}/` → `assets/images/{slug}/`
- 文章 markdown 中引用的图片路径保持 `/images/{slug}/`（prebuild 同步后前端仍从此路径读取）

### Step 6: 更新友链服务 — 适配独立文件格式

**文件**: `src/components/write/services/friends-service.ts`

**读取**（`loadFriendsFromGitHub`）:
- 从 `src/content/friends/list/` 列出所有 `.yaml` 文件
- 逐个解析，合并为 `FriendItem[]` 数组返回

**写入**（`saveFriendsToGitHub`）:
- 使用 `replaceIndividualFiles` 工具函数
- 删除所有旧文件，为每个友链创建 `01.yaml`, `02.yaml`, ...
- 头像图片路径改为 `assets/images/friends/`

### Step 7: 更新导航服务 — 适配独立文件格式

**文件**: `src/components/write/services/navigation-service.ts`

**读取**:
- 从 `src/content/navigation/categories/` 列出所有 `.yaml` 文件
- 内容仓库格式: `{ category, icon, navigations: [...] }`
- 前端格式: `{ title: category, icon, items: navigations }`
- 需要做格式映射

**写入**:
- 使用 `replaceIndividualFiles`，serializer 将前端格式映射回内容仓库格式
- 头像图片路径改为 `assets/images/nav/`

### Step 8: 更新项目服务 — 适配独立文件格式

**文件**: `src/components/write/services/projects-service.ts`

**读取**:
- 从 `src/content/project/src/` 列出所有 `.yaml` 文件
- 格式与 `ProjectItem` 接口一致，直接解析即可

**写入**:
- 使用 `replaceIndividualFiles`
- 头像图片路径改为 `assets/images/projects/`

### Step 9: 更新相册服务 — 适配独立文件格式

**文件**: `src/lib/album-service.ts`

**读取**（`loadAlbumsFromGitHub`）:
- 从 `src/content/album/categories/` 列出所有 `.yaml` 文件
- 内容仓库格式: `{ id, date, event, title, description, icon, photos }`
- 与 `AlbumItem` 接口匹配

**写入**（`saveAlbumsToGitHub`）:
- 使用 `replaceIndividualFiles`
- 相册图片路径从 `public/image/albums` 改为 `assets/albums`

### Step 10: 更新 about-service — 保留在前端仓库

**文件**: `src/components/write/services/about-service.ts`

About 页面编辑的是 Astro 模板代码（`src/pages/about.astro`），这是前端专属的，不应写入内容仓库。使用 `FRONTEND_REPO` 常量替代 `GITHUB_CONFIG.REPO`：

```typescript
const ABOUT_SAVE_OWNER = GITHUB_CONFIG.OWNER
const ABOUT_SAVE_REPO = FRONTEND_REPO  // 硬编码前端仓库
```

### Step 11: 更新 ConfigPage — 配置和音乐数据

**文件**: `src/components/write/ConfigPage.tsx`

路径变更：
- `ryuchan.config.yaml` → 写入内容仓库根目录（路径不变，但目标仓库变了）
- `src/data/music.json` → 写入内容仓库（路径不变，但目标仓库变了）
- 品牌图片（favicon, logo, profile, WeChat, Alipay）: `public/` → `assets/brand/`

### Step 12: 更新 prebuild-content.mjs — 同步脚本适配

**文件**: `scripts/prebuild-content.mjs`

1. **配置处理**: 检查内容仓库根目录是否存在 `ryuchan.config.yaml`，如果存在则直接复制到前端（编辑器已写入），否则回退到原有的模块合成逻辑
2. **博客图片同步**: 新增 `assets/images/` → `public/images/` 的同步步骤
3. **相册图片同步**: 新增 `assets/albums/` → `public/image/albums/` 的同步步骤
4. **音乐数据同步**: 新增 `src/data/music.json` 的复制步骤

### Step 13: 验证

1. **本地构建验证**: 运行 `pnpm prebuild && pnpm build` 确保构建成功
2. **环境变量验证**: 确认 `.env` 中 `PUBLIC_GITHUB_REPO=RyuChan-Content`
3. **GitHub App 验证**: 确保 GitHub App 已安装到 RyuChan-Content 仓库
4. **端到端测试**: 通过 /write 页面创建/编辑文章，验证内容正确写入内容仓库

---

## 关键文件清单

| 操作 | 文件 |
|------|------|
| 新建 | `src/lib/content-paths.ts` |
| 新建 | `src/lib/individual-files.ts` |
| 修改 | `src/consts.ts` |
| 修改 | `.env.example`, `.env` |
| 修改 | `src/components/write/services/push-blog.ts` |
| 修改 | `src/components/write/services/delete-blog.ts` |
| 修改 | `src/components/write/services/batch-delete.ts` |
| 修改 | `src/lib/load-blog.ts` |
| 修改 | `src/components/write/services/friends-service.ts` |
| 修改 | `src/components/write/services/navigation-service.ts` |
| 修改 | `src/components/write/services/projects-service.ts` |
| 修改 | `src/lib/album-service.ts` |
| 修改 | `src/components/write/services/about-service.ts` |
| 修改 | `src/components/write/ConfigPage.tsx` |
| 修改 | `scripts/prebuild-content.mjs` |