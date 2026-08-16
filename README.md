<pre align="center">
一个革新性的静态博客系统，由前端展示、内容存储和可选的 CMS 管理端三个仓库组成。
<br>✨ 支持在线发布文章 · 可视化配置管理 · 无需本地开发环境
</pre>

</br>

<div align="center">
<img alt="Ryuchan Logo" src="https://demo.131714.xyz/logo.png" width="280px">
</div>

[![license](https://badgen.net/github/license/kobaridev/RyuChan)](https://github.com/kobaridev/RyuChan/blob/main/LICENSE)&nbsp;&nbsp;&nbsp;[![release](https://badgen.net/github/release/kobaridev/RyuChan)](https://github.com/kobaridev/RyuChan/releases)

[**🖥️ Demo**](https://demo.131714.xyz)

---

## 🏗️ 系统架构

RyuChan 从 v3.1.0 起拆分为两个核心仓库，可选 CMS 管理端：

| 仓库 | 职责 | 技术栈 | 地址 |
|------|------|--------|------|
| **RyuChan**（前端仓） | Astro 模板、组件、样式、构建配置 | Astro 5.x + Tailwind CSS + React 19 | 当前仓库 |
| **RyuChan-Content**（内容仓） | 文章、站点配置、友链、项目、图片等所有内容 | Markdown / YAML | [kobaridev/RyuChan-Content](https://github.com/kobaridev/RyuChan-Content) |
| **RyuChan-CMS**（管理端·可选） | Web 可视化内容管理后台 | React 19 + Vite + Tailwind CSS | [kobaridev/RyuChan-CMS](https://github.com/kobaridev/RyuChan-CMS) |

```
┌───────────────────────────┐
│  RyuChan-Content（内容仓） │   ┌───────────────────────┐
│  文章/配置/图片/友链等     │   │  RyuChan-CMS（可选）   │
└─────────────┬─────────────┘   │  React/Vite 管理端     │
              │ prebuild clone  │  /blog / /config 等    │
              ▼                 └───────────┬───────────┘
┌───────────────────────┐                   │ trigger-deploy
│      RyuChan          │                   ▼
│  (Astro 前端展示)      │──────────────►  ┌──────────────────┐
│  /blog / /about 等    │   构建同步      │  Cloudflare Pages│
└───────────────────────┘                 │   部署上线         │
                                          └──────────────────┘
```

**为什么拆分？**

- 写文章和改代码互不干扰，内容仓可单独设为私有
- 内容仓提交历史干净，前端部署与内容发布解耦
- 可选使用 RyuChan-CMS 进行可视化内容管理，不依赖亦可正常编辑

---

## ✨ 核心亮点

### 🚀 在线编辑体验

RyuChan 内置了在线编辑能力，无需本地开发环境即可直接管理博客内容：

- ✅ **📝 在线发布/编辑文章** — 在浏览器中编写、预览、发布文章，支持 Markdown 编辑、图片上传、实时预览
- ✅ **⚙️ 可视化配置管理** — `/config` 页面管理网站标题、主题、Banner、社交链接等，无需手动编辑 YAML
- ✅ **🔐 GitHub App 认证** — 基于 GitHub App 的安全认证，所有变更直接提交到内容仓，保持版本控制
- ✅ **📦 多模块编辑** — 友链、导航、相册、音乐等均可在线管理

> **关于页编辑**：`/about-edit` 提供代码级编辑入口（直接编辑 Astro 模板），功能尚在完善中。如需更完善的可视化编辑体验，可配合使用 RyuChan-CMS（见下文）。

![preview](https://picbed.131714.xyz/blog/ryuchan_online_demo1.png)
![preview](https://picbed.131714.xyz/blog/ryuchan_online_demo2.png)

### 🎨 优雅的前端展示

- ✅ 白天 / 黑夜模式切换
- ✅ 极速访问速度与优秀 SEO（SSG 静态生成）
- ✅ 视图过渡动画（ClientRouter）
- ✅ 文章全文搜索（Pagefind）
- ✅ 移动端优先的响应式设计
- ✅ 高度可配置的 Banner（随机图、打字机效果）
- ✅ 使用 [Tailwind CSS](https://tailwindcss.com/) + [daisyUI](https://daisyui.com/) 构建
- ✅ RSS 订阅支持
- ✅ 追番管理（TMDB API + Bilibili 同步）
- ✅ 网站导航（分类资源导航，支持搜索筛选）
- ✅ 音乐播放（Meting API，支持网易云/QQ音乐等平台歌单）
- ✅ 相册与照片墙（瀑布流 + Fancybox 灯箱）

---

## ⬇️ 快速开始

### 前置要求

- [pnpm](https://pnpm.io/) 包管理器
- Git
- GitHub App（用于在线编辑功能）

### 1. 克隆前端仓库

```sh
git clone https://github.com/kobaridev/RyuChan.git
cd RyuChan
pnpm i
```

### 2. 配置内容仓库

前端仓需要关联内容仓才能获取文章和配置。有两种方式：

**方式一：本地开发（推荐）**

将内容仓克隆到同级目录，前端仓会自动检测：

```sh
# 在 RyuChan 的上级目录执行
git clone https://github.com/kobaridev/RyuChan-Content.git ryuchan-content
```

或通过环境变量指定路径：

```env
# 在 RyuChan 根目录创建 .env
CONTENT_REPO=/path/to/ryuchan-content
```

**方式二：CI / 自动化构建**

在环境变量中配置内容仓凭据：

```env
CONTENT_REPO_OWNER=kobaridev
CONTENT_REPO_NAME=RyuChan-Content
CONTENT_REPO_BRANCH=main
CONTENT_TOKEN=ghp_xxxxxxxxxxxx    # 内容仓为私有时需要
```

### 3. 运行

```sh
pnpm run dev
```

---

## 📦 内容仓库结构（RyuChan-Content）

内容仓的所有文件均通过 `prebuild` 脚本同步到前端仓对应位置。

```
ryuchan-content/
├── src/content/
│   ├── site/config.yaml                   # 站点通用配置：标题/描述/主题/favicon/banner
│   ├── user/config.yaml                   # 用户信息：头像/描述/社交链接/收款码
│   ├── footer/config.yaml                 # 页脚：社交链接与备案信息
│   ├── blog/
│   │   ├── config.yaml                    # 博客模块标题/副标题 + 每页文章条数
│   │   └── src/                           # 文章（.md / .mdx），一条记录一篇文章
│   ├── about/
│   │   ├── config.yaml                    # 关于页标题/副标题
│   │   └── src/index.md                   # 关于页正文
│   ├── friends/
│   │   ├── config.yaml                    # 友链页配置
│   │   └── list/                          # 一条友链一个文件（01.yaml, 02.yaml ...）
│   ├── project/
│   │   ├── config.yaml                    # 项目页配置
│   │   └── src/                           # 一个项目一个文件（01.yaml, 02.yaml ...）
│   ├── album/
│   │   ├── config.yaml                    # 相册页配置
│   │   └── categories/                    # 一个相册一个文件（一组照片）
│   ├── navigation/
│   │   ├── config.yaml                    # 导航页配置
│   │   └── categories/                    # 一个分组一个文件（01.yaml, 02.yaml ...）
│   ├── music/
│   │   ├── config.yaml                    # 音乐页配置 + Meting API 基址
│   │   ├── list/                          # 一个播放列表一个文件
│   │   └── custom/                        # 自定义歌单完整数据
│   ├── anime/
│   │   ├── config.yaml                    # 追番页配置 + 数据源列表
│   │   └── provider/                      # bilibili.yaml / tmdb.yaml
│   ├── comments/
│   │   ├── config.yaml                    # 评论开关与选用 provider
│   │   └── provider/                      # giscus.yaml / twikoo.yaml / waline.yaml
│   └── analysis/
│       ├── config.yaml                    # 统计脚本开关
│       └── provider/                      # umami / claity 统计脚本
├── assets/
│   ├── media/                             # 文章配图，构建时映射到 public/image/
│   └── brand/                             # 站点级图片，构建时展开到 public/ 根
│       ├── favicon.ico / logo.png / profile.png / home.webp
│       └── qrcode/
│           ├── Alipay.jpg
│           └── WeChat.jpg
└── ryucms.schema.json                     # RyuChan-CMS 管理端的 collection 定义
```

### 内容 → 前端映射关系

`prebuild` 脚本将内容仓文件同步到前端仓对应位置：

| 内容仓 | 前端仓 |
|--------|--------|
| `src/content/blog/src/` | `src/content/blog/` |
| `src/content/friends/list/*.yaml` | 合成 → `src/data/friends.yaml` |
| `src/content/project/src/*.yaml` | 合成 → `src/data/projects.yaml` |
| `src/content/navigation/categories/*.yaml` | 合成 → `src/data/navigation.yaml` |
| `src/content/album/categories/*.yaml` | 合成 → `src/data/albums.json` |
| `src/content/site/config.yaml` | `config.site.*`（除 pages/menu 外） |
| `src/content/user/config.yaml` | `config.user.*` |
| `src/content/blog/config.yaml` | `config.site.pages.home.*` + `config.site.blog` |
| `src/content/music/list/*.yaml` | 合成 → `ryuchan.config.yaml`（playlists 配置） |
| `src/content/music/custom/*.yaml` | 由 `fetch-music-duration.mjs` 注入 `music.json` |
| `src/content/footer/config.yaml` | 注入前端页脚 |
| `src/content/comments/provider/*.yaml` | Astro 构建时读取 |
| `src/content/anime/provider/*.yaml` | Astro 构建时读取 |
| `src/content/analysis/provider/*.html` | 注入 `<head>` |
| `assets/media/` | `public/image/` |
| `assets/brand/` | `public/` 根（**展开**，含 qrcode） |

> ⚠️ `assets/brand` **展开**到 `public/` 根目录，`/logo.png`、`/profile.png`、`/favicon.ico` 等绝对路径引用保持不变。

---

## 🔧 可选：CMS 管理端（RyuChan-CMS）

RyuChan-CMS 是独立的内容管理后台，可选使用。对于希望完全脱离代码进行内容管理的项目，可作为替代或补充方案。

### 功能模块

| 路由 | 功能 |
|------|------|
| `/dashboard` | 管理面板概览 |
| `/blog` | 文章列表与管理 |
| `/blog/new` | 新建文章 |
| `/blog/:slug/edit` | 编辑已有文章 |
| `/config/site` | 站点全局配置 |
| `/config/module-titles` | 各模块标题设置 |
| `/config/:module` | 模块级配置（comments、anime、music 等） |
| `/navigation` | 导航管理 |
| `/album` | 相册管理 |
| `/friends` | 友链管理 |
| `/projects` | 项目管理 |
| `/music` | 音乐歌单管理 |
| `/about` | 关于页可视化编辑 |

### 技术栈

- React 19 + Vite 8
- Tailwind CSS + daisyUI
- CodeMirror 6（Markdown 编辑器）
- GitHub App OAuth 登录

> CMS 通过 GitHub App OAuth 直接读写 **RyuChan-Content** 内容仓，不依赖前端仓库运行。
> 不部署 CMS 完全不影响 RyuChan 博客的正常使用——内置的 `/write` 和 `/config` 页面提供基础的在线编辑能力。

---

## 🔐 环境变量

### 前端仓（RyuChan）

参考 `.env.example`，各变量说明如下：

| 变量 | 用途 | 必填场景 |
|------|------|----------|
| `PUBLIC_GITHUB_OWNER` | GitHub 用户名/组织（内容仓 owner） | 本地开发、在线编辑 |
| `PUBLIC_GITHUB_REPO` | 内容仓仓库名 | 本地开发、在线编辑 |
| `PUBLIC_GITHUB_BRANCH` | 内容仓分支 | 本地开发、在线编辑 |
| `PUBLIC_GITHUB_APP_ID` | GitHub App ID | 本地开发、在线编辑 |
| `PUBLIC_GITHUB_ENCRYPT_KEY` | 用于 AES-256 加密 PEM 私钥的密钥 | 本地开发、在线编辑（可选） |
| `PUBLIC_FRONTEND_REPO` | 前端仓仓库名（仅 `about-edit` 等写入前端仓的功能需要） | 仅约用 `about-edit` 时 |
| `CONTENT_REPO_OWNER` | 内容仓所属用户/组织 | 所有构建环境 |
| `CONTENT_REPO_NAME` | 内容仓仓库名 | 所有构建环境 |
| `CONTENT_REPO_BRANCH` | 内容仓分支 | 所有构建环境 |
| `CONTENT_TOKEN` | Personal Access Token（repo scope） | 内容仓为私有时 |
| `CONTENT_REPO` | 本地内容仓路径（设置后跳过 clone，性能更快） | 本地开发（可选） |

#### 本地开发（`.env` 文件）

```bash
# 内容仓 GitHub 配置（在线编辑写入目标）
PUBLIC_GITHUB_OWNER=kobaridev
PUBLIC_GITHUB_REPO=RyuChan-Content
PUBLIC_GITHUB_BRANCH=main
PUBLIC_GITHUB_APP_ID=           # 你的 GitHub App ID
PUBLIC_GITHUB_ENCRYPT_KEY=      # 你的 AES-256 加密密钥（可选）

# 前端仓名称（仅 about-edit 需要，默认 RyuChan）
# PUBLIC_FRONTEND_REPO=RyuChan

# 内容仓（推荐：克隆到同级目录自动检测）
# git clone https://github.com/kobaridev/RyuChan-Content.git ../ryuchan-content

# 或手动指定路径
# CONTENT_REPO=/absolute/path/to/ryuchan-content

# CI 构建用（本地可省略）
CONTENT_REPO_OWNER=kobaridev
CONTENT_REPO_NAME=RyuChan-Content
CONTENT_REPO_BRANCH=main
# CONTENT_TOKEN=ghp_xxxxxxxxxxxx  # 内容仓为私有时需要
```

#### GitHub Actions Secrets（前端仓）

| Secret | deploy-pages | deploy-vercel | deploy-worker |
|--------|:---:|:---:|:---:|
| `CONTENT_TOKEN` | 私有仓时需要 | 私有仓时需要 | 私有仓时需要 |
| `CLOUDFLARE_API_TOKEN` | ✅ | — | ✅ |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ | — | ✅ |
| `VERCEL_TOKEN` | — | ✅ | — |
| `VERCEL_ORG_ID` | — | ✅ | — |
| `VERCEL_PROJECT_ID` | — | ✅ | — |

> 配置地址：`https://github.com/<owner>/RyuChan/settings/secrets/actions`

---

### 内容仓（RyuChan-Content）

内容仓本身不需要环境变量，但需要配置 Actions Secrets 以触发前端部署：

| Secret | 说明 |
|--------|------|
| `FRONTEND_REPO_OWNER` | 前端仓所属用户/组织 |
| `FRONTEND_REPO_NAME` | 前端仓仓库名 |
| `FRONTEND_BRANCH` | 触发部署的目标分支 |
| `DISPATCH_TOKEN` | 具有 `repo` scope 的 Personal Access Token |

> 配置地址：`https://github.com/<owner>/RyuChan-Content/settings/secrets/actions`

---

### CMS 管理端（RyuChan-CMS，可选）

参考 `.env.example`：

| 变量 | 用途 | 必填场景 |
|------|------|----------|
| `VITE_GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | 所有环境 |
| `VITE_OAUTH_PROXY_URL` | OAuth 代理地址 | 所有环境 |

本地开发：`VITE_OAUTH_PROXY_URL=http://localhost:8787`
生产部署：`VITE_OAUTH_PROXY_URL=https://auth.131714.xyz`

还需通过 Cloudflare Worker Secrets 配置（通过 `npx wrangler secret put`）：
- `GITHUB_CLIENT_ID` — GitHub OAuth Client ID
- `GITHUB_CLIENT_SECRET` — GitHub OAuth Client Secret（私密，不能放 `.env`）
- `REDIRECT_URI` — OAuth 回调地址（必须与 GitHub OAuth App 设置的回调地址一致）
- `CMS_ORIGIN` — CMS 前端部署地址，如 `https://cms-xxx.vercel.app`

> 详细 OAuth 代理配置见 [RyuChan-CMS](https://github.com/kobaridev/RyuChan-CMS)。

---

## 📝 配置详解（site/config.yaml）

RyuChan 的所有网站配置由内容仓的 `src/content/site/config.yaml` 驱动，以下是完整字段说明：

### site 配置

```yaml
site:
  tab: RyuChan                      # 浏览器标签页标题
  title: RyuChan                    # 站点主标题
  title_type: text                  # 导航栏标题展示方式：text（文字）或 image（图片）
  title_image: /logo.png            # title_type 为 image 时使用的图片
  description: 站点描述文字           # SEO meta description
  language: zh                      # 语言代码（zh / en）
  favicon: /favicon.ico             # 站点图标
  theme:
    light: garden                   # 浅色主题（daisyUI 主题名）
    dark: dracula                   # 深色主题（daisyUI 主题名）
    code: snazzy-light              # 代码高亮主题
  date_format: ddd MMM DD YYYY      # 日期显示格式
  banner:
    enableRandom: true              # 是否启用随机 Banner 图
    randomUrl: https://t.alcy.cc/ycy # 随机图 API 地址
    randomCount: 5                  # 每次随机获取图片数量
    height: 70vh                    # Banner 区域高度
    images:                         # 固定图片列表（enableRandom 为 false 时使用）
      - https://example.com/bg1.jpg
  menu:                             # 顶部导航菜单
    - id: write
      text: 写作
      href: /write
      svg: material-symbols:edit-square-outline-rounded
      target: _self
```

### user 配置

```yaml
user:
  name: 作者名
  description: 个人简介
  site: https://example.com       # 个人主页
  avatar: /profile.png            # 头像（位于 assets/brand/）
  qr_wechat: /WeChat.jpg          # 微信收款码
  qr_alipay: /Alipay.jpg          # 支付宝收款码
  sidebar:
    social:                       # 侧边栏社交图标（Iconify 图标名）
      - href: https://github.com/user
        ariaLabel: Github
        svg: ri:github-line
  footer:
    social:                       # 页脚社交图标
      - href: https://twitter.com/user
        ariaLabel: Twitter
        svg: ri:twitter-line
```

### 其他模块配置

```yaml
# blog/config.yaml
title: 博客标题
subtitle: 博客副标题
pageSize: 8                       # 每页文章条数
typewriterTexts:                  # 首页打字机效果文本
  - Hello World
  - 欢迎来到我的博客

# comments/config.yaml
enable: true
provider: twikoo                  # twikoo / waline / giscus

# comments/provider/twikoo.yaml
envId: xxx

# comments/provider/waline.yaml
serverURL: https://waline.example.com
lang: zh

# comments/provider/giscus.yaml
repo: owner/repo
repoId: xxx
category: Announcements
categoryId: xxx

# anime/config.yaml
title: 追番
provider:
  - bilibili
  - tmdb
subtitle: 记录和分享我喜欢的动漫

# anime/provider/bilibili.yaml
uid: 12345678

# anime/provider/tmdb.yaml
apiKey: xxx
listId: 12345

# music/config.yaml
title: Music
api: https://meting.mikus.ink/api # Meting API 基址
subtitle: 沉浸式享受音乐时光

# analysis/config.yaml
enable: true
provider:
  - umami-head                    # 或 claity

# analysis/provider/umami-head.yaml
baseUrl: https://umami.example.com
shareId: xxx
websiteId: xxx
timezone: Asia/Shanghai
```

---

## 📝 文章写作约定

文章 frontmatter 必填 `title`、`description`、`pubDate`，可选 `updated`、`image`、`badge`、`draft`、`categories`、`tags`。

| 名称 | 含义 | 是否必要 | 说明 |
|:----:|:----:|:--------:|------|
| title | 文章标题 | 是 | 同时用作 URL slug |
| description | 文章简介 | 是 | 显示在文章列表卡片 |
| pubDate | 发布日期 | 是 | ISO 格式推荐：`2026-08-16T00:00`，兼容历史格式如 `Jul 01 2024` |
| updated | 更新日期 | 否 | 同 pubDate 格式 |
| image | 文章封面 | 否 | 图片路径写 `/image/xxx.webp`（位于 `assets/media/`） |
| categories | 文章分类 | 否 | 字符串数组，如 `["技术", "生活"]` |
| tags | 文章标签 | 否 | 字符串数组，如 `["Astro", "博客"]` |
| badge | 文章徽标 | 否 | 设为 `Pin` 可置顶文章 |
| draft | 草稿状态 | 否 | 设为 `true` 则不在列表展示 |

> **配图引用**：图片文件放在 `assets/media/`，frontmatter 和正文中统一写 `/image/xxx`。例如文件 `assets/media/image1.webp`，写 `image: /image/image1.webp`。

> **MDX 文章**：扩展名为 `.mdx` 的文章可使用 `src/components/mdx/` 下的自定义组件，如 `<Diff l="/image/l.webp" r="/image/r.webp" />`。

---

## 🌐 页面功能

### 追番页面
- 集成 TMDB API 获取动漫元数据
- 支持 Bilibili 追番列表同步
- 实时搜索和筛选，按类型、评分排序

### 导航页面
- 分类资源导航，支持搜索和筛选
- 响应式卡片布局

### 相册页面
- 瀑布流照片展示，支持多种比例（1x1 / 4x3 / 4x5 / 9x16）
- Fancybox 灯箱浏览

### 音乐页面
- 基于 Meting API 的多平台音乐播放
- 支持网易云、QQ音乐等平台歌单
- 自定义播放列表（`provider: custom`）

### 静态页面
- **About** — 个人简介、技术栈展示
- **Friends** — 友链展示和站点展示
- **Projects** — 个人项目展示

---

## 🛠️ 部署流程

### 最低配置（仅搭建博客）

仅需部署前端仓，无需 CMS：

```
1. 克隆内容仓到任意位置（或公开仓库）
2. 克隆前端仓，克隆内容仓到同级目录
3. 配置 GitHub Actions Secrets（CLOUDFLARE_*、CONTENT_TOKEN 如有）
4. push 代码触发 deploy-pages workflow
5. 内容更新时，push 内容仓自动触发 trigger-deploy → 前端 redeploy
```

### 完整配置（含可选 CMS）

```
1. 前端仓（RyuChan）→ Cloudflare Pages / Vercel / Workers
   - Secrets: CONTENT_TOKEN（私有仓）、CLOUDFLARE_API_TOKEN、CLOUDFLARE_ACCOUNT_ID
   - 或 VERCEL_TOKEN、VERCEL_ORG_ID、VERCEL_PROJECT_ID

2. 内容仓（RyuChan-Content）→ GitHub 公共/私有仓库
   - Secrets: FRONTEND_REPO_OWNER、FRONTEND_REPO_NAME、FRONTEND_BRANCH、DISPATCH_TOKEN
   - push 触发 trigger-deploy.yml → repository_dispatch → 前端 redeploy

3. CMS 管理端（RyuChan-CMS）→ 任意静态托管（Vercel / Cloudflare Pages 等）
   - Env: VITE_GITHUB_CLIENT_ID、VITE_OAUTH_PROXY_URL
   - OAuth 代理 Cloudflare Worker Secrets:
     GITHUB_CLIENT_ID、GITHUB_CLIENT_SECRET、REDIRECT_URI、CMS_ORIGIN
```

### 部署流程一图概览

```
本地开发：
  RyuChan-Content（本地 clone）
       ↓ prebuild 脚本同步
  RyuChan（pnpm dev）→ 浏览器访问

线上部署（无 CMS）：
  push 内容仓  →  trigger-deploy  →  repository_dispatch  →  前端仓库 build + deploy
  push 前端仓  →  deploy-pages workflow  →  Cloudflare Pages

线上部署（含 CMS）：
  push 内容仓  →  trigger-deploy  →  前端 redeploy
  CMS 部署（Vercel 等）→ GitHub OAuth → 直接读写内容仓
```

---

## 🛠️ 常用命令

```sh
pnpm dev                  # 启动开发服务器
pnpm build                # 完整构建（prebuild → astro build → pagefind 索引）
pnpm run search:index     # 生成/更新全文搜索索引
pnpm run preview          # 本地预览构建产物
pnpm run check            # Astro 类型检查
pnpm run deploy           # 构建并部署到 Cloudflare Pages
pnpm run prefetch:music   # 预取音乐时长数据
pnpm run search:clean     # 清理搜索索引
```

---

## 🙏 致谢

本项目基于以下优秀的开源项目：

- **Frosti** — 项目核心基础，由 [EveSunMaple](https://github.com/EveSunMaple/Frosti) 开发
- **Yukina** — 部分设计巧思来自 [WhitePaper233](https://github.com/WhitePaper233/yukina)
- **Mizuki** — 部分功能实现借鉴了 [matsuzaka-yuki](https://github.com/matsuzaka-yuki/Mizuki)
- **2025-blog-public** — 在线编辑文章和配置站点的灵感来源，由 [yysuni](https://github.com/YYsuni/2025-blog-public) 开发
- **RyuChan-CMS** — 可选的可视化 CMS 管理端，由同一作者开发，见 [kobaridev/RyuChan-CMS](https://github.com/kobaridev/RyuChan-CMS)

感谢所有开源社区的贡献者们！

---

## 📝 许可证

本项目采用 [MIT 许可证](https://github.com/kobaridev/RyuChan/blob/main/LICENSE)。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
