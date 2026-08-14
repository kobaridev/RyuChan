<pre align="center">
一个革新性的静态博客模板！🚀 基于 Astro 5.0+ & Tailwind CSS 开发
<br>✨ 支持在线发布文章 · 可视化配置管理 · 无需本地开发环境
</pre>


<div align="center">
<img alt="Ryuchan Logo" src="https://demo.131714.xyz/logo.png" width="280px">
</div>



[![license](https://badgen.net/github/license/kobaridev/RyuChan)](https://github.com/kobaridev/RyuChan/blob/main/LICENSE)&nbsp;&nbsp;&nbsp;[![release](https://badgen.net/github/release/kobaridev/RyuChan)](https://github.com/kobaridev/RyuChan/releases)

[**🖥️ Ryuchan Demo**](https://demo.131714.xyz)

> 🎉 **v3.0.0 已发布！** 架构全面升级：**内容与前端代码隔离，拆分为两个独立仓库**，实现更灵活的内容管理与部署方式。

---

## 🏗️ 架构概览

v3.0.0 起，RyuChan 拆分为两个独立仓库：

| 仓库 | 说明 | 地址 |
|------|------|------|
| **RyuChan**（前端仓） | Astro 模板、组件、样式、构建配置 | 当前仓库 |
| **ryuchan-content**（内容仓） | 文章、站点配置、友链、项目、图片等所有内容 | [kobaridev/RyuChan-Content](https://github.com/kobaridev/RyuChan-Content) |

```
┌─────────────────────┐         ┌──────────────────────┐
│   RyuChan（前端仓）   │  prebuild │  ryuchan-content（内容仓）│
│                     │ ◄──────── │                      │
│  Astro 模板 / 组件    │   同步    │  文章 / 配置 / 图片     │
│  CSS / 构建 / 部署   │           │  友链 / 项目 / 追番     │
└─────────┬───────────┘           └──────────┬───────────┘
          │                                  │
          ▼                                  ▼
    Cloudflare Pages               GitHub Actions 触发
       部署上线                    内容更新 → 自动部署
```

**为什么拆分？** 写文章和改代码互不干扰，内容仓可独立设为私有，提交历史干净，RyuCMS 管理端可直接编辑内容仓。

---

## ✨ 核心亮点

### 🚀 革命性的在线管理体验

- ✅ **📝 在线发布文章** - 浏览器中直接编写、预览、发布文章，支持Markdown编辑、图片上传、实时预览
- ✅ **⚙️ 可视化配置管理** - Web界面管理网站配置，无需编辑YAML文件，支持实时预览和一键保存
- ✅ **🔐 GitHub集成** - 基于GitHub App的安全认证，所有变更直接提交到仓库，保持版本控制

![preview](https://picbed.131714.xyz/blog/ryuchan_online_demo1.png)
![preview](https://picbed.131714.xyz/blog/ryuchan_online_demo2.png)

### 🎨 优雅的设计与功能

- ✅ **白天** / **黑夜** 模式可用
- ✅ 极速的访问速度与优秀的 SEO
- ✅ 视图过渡动画（使用 ClientRouter）
- ✅ 支持文章全文搜索（Pagefind）
- ✅ 移动端优先的响应式设计（优化卡片布局、网格导航）
- ✅ 高度可配置的 Banner（支持随机图、打字机效果、高度自定义）
- ✅ 使用 [Tailwind CSS](https://tailwindcss.com/) 与 [daisyUI](https://daisyui.com/) 构建自适应页面
- ✅ RSS 订阅支持
- ✅ 追番管理（集成 TMDB API，支持动漫追踪和评分）
- ✅ 网站导航（分类资源导航，支持搜索和筛选）
- ✅ 静态页面（About、Friends、Projects、Album、Music 页面）
- ✅ 文章增强功能（阅读统计、赞赏、分享）

---

## ⬇️ 快速开始

### 前置要求

- [pnpm](https://pnpm.io/) 包管理器
- Git

### 1. 克隆前端仓库

```sh
git clone https://github.com/kobaridev/RyuChan.git
cd RyuChan
pnpm i
```

### 2. 配置内容仓库

前端仓需要关联内容仓才能获取文章和配置。有两种方式：

**方式一：本地开发（推荐）**

直接克隆内容仓到前端仓同级目录，前端仓会自动检测：

```sh
# 在 RyuChan 的上级目录执行
git clone https://github.com/kobaridev/RyuChan-Content.git ryuchan-content
```

或者通过环境变量手动指定路径：

```.env
# 在 RyuChan 根目录创建 .env
CONTENT_REPO=/path/to/ryuchan-content
```

**方式二：CI / 自动化构建**

在环境变量中配置内容仓凭据，构建时自动 clone：

```.env
CONTENT_REPO_OWNER=kobaridev
CONTENT_REPO_NAME=RyuChan-Content
CONTENT_REPO_BRANCH=main
CONTENT_TOKEN=ghp_xxxxxxxxxxxx    # 内容仓为私有时需要 Personal Access Token
```

### 3. 运行

```sh
pnpm run dev
```

---

## 📁 内容仓库结构

内容仓 `ryuchan-content` 的所有文件均通过 `prebuild` 脚本同步到前端仓对应位置。以下是完整目录结构：

```
ryuchan-content/
├── src/content/
│   ├── site/config.yaml                   # 站点通用配置：标题/描述/主题/菜单/favicon/banner
│   ├── user/config.yaml                   # 用户信息：头像/描述/社交链接/收款码
│   ├── github/config.yaml                 # GitHub App 认证（敏感，建议加密存储）
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
│   │   └── list/                          # 一个播放列表一个文件
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
└── ryucms.schema.json                     # RyuCMS 管理端的 collection 定义
```

---

## 🔗 内容 → 前端 映射关系

`prebuild` 脚本将内容仓文件同步到前端仓的对应位置：

| 内容仓 | 前端仓 |
|--------|--------|
| `src/content/blog/src/` | `src/content/blog/` |
| `src/content/friends/list/*.yaml` | 合成 → `src/data/friends.yaml` |
| `src/content/project/src/*.yaml` | 合成 → `src/data/projects.yaml` |
| `src/content/navigation/categories/*.yaml` | 合成 → `src/data/navigation.yaml` |
| `src/content/album/categories/*.yaml` | 合成 → `src/data/albums.json` |
| `src/content/site/config.yaml` | `config.site.*`（除 pages/menu 外） |
| `src/content/user/config.yaml` | `config.user.*` |
| `src/content/github/config.yaml` | `config.github.*` |
| `src/content/blog/config.yaml` | `config.site.pages.home.*` + `config.site.blog` |
| `src/content/music/list/*.yaml` | 合成 → `src/data/music.json` |
| `src/content/footer/config.yaml` | 注入前端页脚 |
| `src/content/comments/provider/*.yaml` | Astro 构建时读取 |
| `src/content/anime/provider/*.yaml` | Astro 构建时读取 |
| `src/content/analysis/provider/*.html` | 注入 `<head>` |
| `assets/media/` | `public/image/`（路径名改变，引用时写 `/image/`） |
| `assets/brand/` | `public/` 根（**展开**，含 qrcode 子目录文件） |

> ⚠️ `assets/brand` **展开**到 `public/` 根目录，`/logo.png`、`/profile.png`、`/favicon.ico`、`/Alipay.jpg`、`/WeChat.jpg` 等绝对路径引用保持不变。

---

## � 环境变量

项目通过环境变量管理配置，不同平台需要配置不同的变量。参考 `.env.example`。

### 变量清单

| 变量 | 用途 | 必填场景 |
|------|------|----------|
| `PUBLIC_GITHUB_OWNER` | GitHub 用户名/组织 | 本地开发、在线编辑 |
| `PUBLIC_GITHUB_REPO` | 前端仓仓库名 | 本地开发、在线编辑 |
| `PUBLIC_GITHUB_BRANCH` | 目标分支 | 本地开发、在线编辑 |
| `PUBLIC_GITHUB_APP_ID` | GitHub App ID | 本地开发、在线编辑 |
| `PUBLIC_GITHUB_ENCRYPT_KEY` | GitHub App 加密密钥 | 本地开发、在线编辑 |
| `CONTENT_REPO_OWNER` | 内容仓所属用户/组织 | 所有构建环境 |
| `CONTENT_REPO_NAME` | 内容仓仓库名 | 所有构建环境 |
| `CONTENT_REPO_BRANCH` | 内容仓分支 | 所有构建环境 |
| `CONTENT_TOKEN` | Personal Access Token（repo scope） | 内容仓为私有时 |
| `CONTENT_REPO` | 本地内容仓路径（设置后跳过 clone） | 本地开发（可选） |

### 按平台配置

#### 1️⃣ 本地开发（`.env` 文件）

在项目根目录创建 `.env`：

```bash
# GitHub App 配置（/write /config 在线编辑）
PUBLIC_GITHUB_OWNER=kobaridev
PUBLIC_GITHUB_REPO=RyuChan
PUBLIC_GITHUB_BRANCH=main
PUBLIC_GITHUB_APP_ID=           # 你的 GitHub App ID
PUBLIC_GITHUB_ENCRYPT_KEY=      # 你的 GitHub App 加密密钥

# 内容仓（推荐方式：克隆到同级目录，自动检测）
# git clone https://github.com/kobaridev/RyuChan-Content.git ../ryuchan-content

# 或手动指定路径
# CONTENT_REPO=/absolute/path/to/ryuchan-content

# 或通过 GitHub clone（内容仓为私有时需要 CONTENT_TOKEN）
CONTENT_REPO_OWNER=kobaridev
CONTENT_REPO_NAME=RyuChan-Content
CONTENT_REPO_BRANCH=main
# CONTENT_TOKEN=ghp_xxxxxxxxxxxx
```

#### 2️⃣ GitHub Actions Secrets

三个 deploy workflow 均已硬编码 `CONTENT_REPO_OWNER` / `CONTENT_REPO_NAME` / `CONTENT_REPO_BRANCH`，无需额外配置。需要添加的 Secrets：

| Secret | deploy-pages | deploy-vercel | deploy-worker |
|--------|:---:|:---:|:---:|
| `CONTENT_TOKEN` | 私有仓时需要 | 私有仓时需要 | 私有仓时需要 |
| `CLOUDFLARE_API_TOKEN` | ✅ | — | ✅ |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ | — | ✅ |
| `VERCEL_TOKEN` | — | ✅ | — |
| `VERCEL_ORG_ID` | — | ✅ | — |
| `VERCEL_PROJECT_ID` | — | ✅ | — |

> **配置地址**：`https://github.com/<owner>/RyuChan/settings/secrets/actions`

#### 3️⃣ Vercel Dashboard（直接部署到 Vercel 时）

如果通过 Vercel Dashboard 直接部署（非 GitHub Actions），需要在 Vercel 项目设置中添加：

| Key | Value |
|-----|-------|
| `CONTENT_REPO_OWNER` | `kobaridev` |
| `CONTENT_REPO_NAME` | `RyuChan-Content` |
| `CONTENT_REPO_BRANCH` | `main` |
| `CONTENT_TOKEN` | 内容仓为私有时需要 |

> **配置地址**：`https://vercel.com/<team>/<project>/settings/environment-variables`

#### 4️⃣ 内容仓（`ryuchan-content` GitHub Actions）

内容仓的 `trigger-deploy.yml` 在内容更新时触发前端仓重新部署，需要以下 Secrets：

| Secret | 说明 |
|--------|------|
| `FRONTEND_REPO_OWNER` | 前端仓所属用户/组织 |
| `FRONTEND_REPO_NAME` | 前端仓仓库名 |
| `FRONTEND_BRANCH` | 触发部署的目标分支 |
| `DISPATCH_TOKEN` | 具有 `repo` scope 的 Personal Access Token |

> **配置地址**：`https://github.com/<owner>/RyuChan-Content/settings/secrets/actions`

---

## �� 在线发布文章

RyuChan 提供了强大的在线文章发布功能，让你无需本地开发环境即可直接在浏览器中编写、预览和发布文章。

### 🚀 核心功能

- **📝 富文本编辑器**: 支持Markdown语法，提供快捷键操作（Ctrl+B加粗、Ctrl+I斜体、Ctrl+K链接）
- **🖼️ 图片管理**: 支持本地上传和URL链接，拖拽操作，自动生成Markdown引用
- **🎨 封面设置**: 拖拽或上传图片作为文章封面
- **👀 实时预览**: 边写边预览，所见即所得的渲染效果
- **📊 元信息管理**: 标签、分类、发布时间、草稿状态等
- **📥 Markdown导入**: 支持导入本地.md文件继续编辑

### 🔐 认证与安全

使用GitHub App私钥（.pem文件）进行身份验证，确保只有授权用户可以发布内容。所有文章变更直接提交到**内容仓** `src/content/blog/src/` 目录。

### 📱 使用流程

1. **访问写作页面**: 浏览器打开 `/write`
2. **导入私钥**: 点击"导入密钥"按钮，选择GitHub App的.pem私钥文件
3. **编写文章**:
   - 输入标题和内容
   - 设置封面图片
   - 添加标签和分类
   - 使用快捷键提升编辑效率
4. **预览确认**: 点击"预览"查看最终效果
5. **发布文章**: 点击"发布"按钮，文章将自动提交到内容仓，触发前端自动部署

### ✏️ 编辑模式

通过 `/write?slug=文章slug` 可以编辑已发布的文章，编辑模式下提供：

- 更新按钮替代发布按钮
- 删除文章功能
- 取消编辑选项

---

## ⚙️ 在线配置网站

RyuChan 提供了革命性的可视化配置编辑器，让你通过Web界面轻松管理网站的所有设置，无需手动编辑YAML文件。

### 🎯 核心功能

- **🎨 可视化界面**: 直观的表单控件替代复杂的YAML语法
- **📸 图片上传**: 直接上传网站图标、头像等图片资源
- **🔗 社交链接管理**: 可视化添加、删除、排序社交媒体链接
- **⚡ 实时预览**: 配置更改即时生效，支持可视化/代码模式切换
- **🔒 安全保存**: 基于GitHub API的安全认证，配置变更直接提交到内容仓

### 📋 支持的配置项

- **网站基本信息**: 标题、描述、图标、头像等 → `site/config.yaml`
- **主题设置**: 浅色/深色主题、代码高亮样式 → `site/config.yaml`
- **Banner配置**: 随机图API、高度设置、打字机效果 → `site/config.yaml`
- **功能集成**: TMDB追番、Bilibili追番、评论系统、统计工具 → `anime/`、`comments/`、`analysis/`
- **菜单导航**: 动态添加、删除、排序菜单项 → `site/config.yaml`
- **社交媒体**: 侧边栏和页脚社交链接管理 → `user/config.yaml`、`footer/config.yaml`

### 🚀 快速开始

1. **访问配置页面**: 浏览器打开 `/config`
2. **身份验证**: 导入GitHub App的.pem私钥文件
3. **可视化编辑**:
   - 在表单中修改各项设置
   - 上传图片资源
   - 配置功能集成
4. **实时预览**: 切换预览模式查看效果
5. **一键保存**: 点击保存按钮，配置自动提交到内容仓

### 💡 特色优势

- **零学习成本**: 无需学习YAML语法，通过直观的界面完成所有配置
- **即时反馈**: 配置更改可以立即预览效果
- **版本控制**: 所有配置变更都有Git版本记录
- **安全可靠**: 基于GitHub App的安全认证机制

---

## ✒️ 文章信息

|    名称     |   含义   | 是否必要 |
| :---------: | :------: | :------: |
|    title    | 文章标题 |    是    |
| description | 文章简介 |    是    |
|   pubDate   | 文章日期 |    是    |
|    image    | 文章封面 |    否    |
| categories  | 文章分类 |    否    |
|    tags     | 文章标签 |    否    |
|    badge    | 文章徽标 |    否    |
|    draft    | 草稿状态 |    否    |

> [!TIP]
>
> - 你可以通过把 `badge` 属性设置为 `Pin` 来置顶你的文章
> - 设置 `draft: true` 可将文章标记为草稿，草稿文章不会在列表显示

---

## � 页面功能

### 追番页面

- 集成 TMDB API 获取动漫元数据
- 支持 Bilibili 追番列表同步
- 实时搜索和筛选功能
- 按类型、评分排序

### 导航页面

- 分类资源导航
- 支持搜索和分类筛选
- 响应式卡片布局

### 相册页面

- 瀑布流照片展示
- 支持多种比例（1x1 / 4x3 / 4x5 / 9x16）
- 集成 Fancybox 灯箱浏览

### 音乐页面

- 基于 Meting API 的多平台音乐播放
- 支持网易云、QQ音乐等平台歌单
- 自定义播放列表

### 静态页面

- **About 页面**: 个人简介、技术栈展示
- **Friends 页面**: 友链展示和站点展示
- **Projects 页面**: 个人项目展示

---

## 🙏 致谢

本项目基于以下优秀的博客模板开发：

- **Frosti**: 项目的核心基础，由 [EveSunMaple](https://github.com/EveSunMaple/Frosti) 开发
- **Yukina**: 部分设计巧思参考自 [WhitePaper233](https://github.com/WhitePaper233/yukina) 开发的模板
- **Mizuki**: 部分功能实现借鉴了 [matsuzaka-yuki](https://github.com/matsuzaka-yuki/Mizuki) 开发的模板
- **2025-blog-public**: 在线编辑文章，配置站点等功能借鉴了 [yysuni](https://github.com/YYsuni/2025-blog-public) 开发的项目

感谢所有开源社区的贡献者们！

---

## 📝 许可证

本项目采用 [MIT 许可证](https://github.com/kobaridev/RyuChan/blob/main/LICENSE)。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

------