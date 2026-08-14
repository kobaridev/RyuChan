<pre align="center">  
一个革新性的静态博客模板！🚀 基于 Astro 5.0+ & Tailwind CSS 开发  
<br>✨ 支持在线发布文章 · 可视化配置管理 · 无需本地开发环境  
</pre>  


<div align="center">  
<img alt="Ryuchan Logo" src="public/logo.png" width="280px">  
</div>  


[![license](https://badgen.net/github/license/kobaridev/RyuChan)](https://github.com/kobaridev/RyuChan/blob/main/LICENSE)&nbsp;&nbsp;&nbsp;[![release](https://badgen.net/github/release/kobaridev/RyuChan)](https://github.com/kobaridev/RyuChan/releases)  

[**🖥️ Ryuchan Demo**](https://demo.131714.xyz)  

> � **v3.0.0 已发布！** 架构全面升级：**内容与前端代码隔离，拆分为两个独立仓库**，实现更灵活的内容管理与部署方式。  

## 📷 预览  

![preview](https://picbed.131714.xyz/blog/ryuchan_preview.png)  

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
- ✅ 静态页面（About、Friends、Projects 页面）  
- ✅ 文章增强功能（阅读统计、赞赏、分享）  

---

## 📝 在线发布文章  

RyuChan 提供了强大的在线文章发布功能，让你无需本地开发环境即可直接在浏览器中编写、预览和发布文章。  

### 🚀 核心功能  

- **📝 富文本编辑器**: 支持Markdown语法，提供快捷键操作（Ctrl+B加粗、Ctrl+I斜体、Ctrl+K链接）  
- **🖼️ 图片管理**: 支持本地上传和URL链接，拖拽操作，自动生成Markdown引用  
- **🎨 封面设置**: 拖拽或上传图片作为文章封面  
- **👀 实时预览**: 边写边预览，所见即所得的渲染效果  
- **📊 元信息管理**: 标签、分类、发布时间、草稿状态等  
- **📥 Markdown导入**: 支持导入本地.md文件继续编辑  

### 🔐 认证与安全  

使用GitHub App私钥（.pem文件）进行身份验证，确保只有授权用户可以发布内容。  

### 📱 使用流程  

1. **访问写作页面**: 浏览器打开 `/write`  
2. **导入私钥**: 点击"导入密钥"按钮，选择GitHub App的.pem私钥文件  
3. **编写文章**:   
   - 输入标题和内容  
   - 设置封面图片  
   - 添加标签和分类  
   - 使用快捷键提升编辑效率  
4. **预览确认**: 点击"预览"查看最终效果  
5. **发布文章**: 点击"发布"按钮，文章将自动提交到GitHub仓库  

### ✏️ 编辑模式  

通过 `/write?slug=文章slug` 可以编辑已发布的文章，编辑模式下提供：  

- 更新按钮替代发布按钮  
- 删除文章功能  
- 取消编辑选项  

---

## ⚙️ 在线配置网站  

RyuChan 提供了革命性的可视化配置编辑器，让你通过Web界面轻松管理网站的所有设置，无需手动编辑YAML文件。  

### 🎯 核心功能  

- **🎨 可视化界面**: 直观的表单控件替代复杂的YAML语法 [4-cite-0](#4-cite-0)   
- **📸 图片上传**: 直接上传网站图标、头像等图片资源 [4-cite-1](#4-cite-1)   
- **🔗 社交链接管理**: 可视化添加、删除、排序社交媒体链接 [4-cite-2](#4-cite-2)   
- **⚡ 实时预览**: 配置更改即时生效，支持可视化/代码模式切换 [4-cite-3](#4-cite-3)   
- **🔒 安全保存**: 基于GitHub API的安全认证，配置变更直接提交到仓库 [4-cite-4](#4-cite-4)   

### 📋 支持的配置项  

- **网站基本信息**: 标题、描述、图标、头像等  
- **主题设置**: 浅色/深色主题、代码高亮样式  
- **Banner配置**: 随机图API、高度设置、打字机效果  
- **功能集成**: TMDB追番、Bilibili追番、评论系统、统计工具  
- **菜单导航**: 动态添加、删除、排序菜单项  
- **社交媒体**: 侧边栏和页脚社交链接管理  

### 🚀 快速开始  

1. **访问配置页面**: 浏览器打开 `/config` [4-cite-5](#4-cite-5)   
2. **身份验证**: 导入GitHub App的.pem私钥文件  
3. **可视化编辑**:   
   - 在表单中修改各项设置  
   - 上传图片资源  
   - 配置功能集成  
4. **实时预览**: 切换预览模式查看效果  
5. **一键保存**: 点击保存按钮，配置自动提交到GitHub  

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

## ⬇️ 使用方法  

1. 安装 pnpm 包管理器（如果你没有安装过的话）  

```sh  
npm i -g pnpm
```

1. 克隆项目

```
git clone https://github.com/kobaridev/RyuChan.git Ryuchan
```

1. 进入项目文件夹

```
cd Ryuchan
```

1. 安装依赖

```
pnpm i
```

1. 调试、运行项目

**首次运行或更新内容后**，请先执行 `search:index` 来生成搜索索引：

```
# 生成搜索索引以供开发时使用  [2](#header-2)
pnpm run search:index  
  
pnpm run dev
```

## 🔧 配置

Ryuchan 使用 `ryuchan.config.yaml` 作为配置文件，你可以通过在线配置编辑器或直接编辑此文件来管理网站设置。

### 网站基本信息 (site)

```
site:  
  tab: Ryuchan # 浏览器标签栏上显示的文本  
  title: Ryuchan # 网站的主标题  
  description: A clean, elegant, and fast static blog template! # 网站描述，用于SEO  
  language: zh # 网站的语言代码，如"en"表示英文，"zh"表示中文  
  favicon: /favicon.ico # 网站图标路径
```

### 主题设置 (theme)

```
theme:  
  light: winter # 浅色模式的主题，基于daisyUI的主题  
  dark: dracula # 深色模式的主题，基于daisyUI的主题  
  code: github-dark # 代码块的主题样式
```

- 主题基于 [daisyUI](https://daisyui.com/docs/themes/) 提供的主题选项
- 代码块主题使用 [Shiki](https://shiki.style/themes) 提供的样式

### TMDB 配置 (追番功能)

```
tmdb:  
  apiKey: "your-tmdb-api-key" # TMDB API Key (v3 auth)  
  listId: "your-list-id" # TMDB List ID
```

### Bilibili 配置 (追番功能)

```
bilibili:  
  uid: "your-bilibili-uid" # Bilibili 用户 ID
```

### 菜单配置 (menu)

```
menu:  
  - id: home # 菜单项唯一标识符  
    text: 首页 # 菜单显示的文本  
    href: / # 链接地址  
    svg: "material-symbols:home-outline-rounded" # 图标  
    target: _self # 链接打开方式  
  - id: write  
    text: 写作  
    href: /write  
    svg: "material-symbols:edit-outline"  
    target: _self  
  - id: config  
    text: 配置  
    href: /config  
    svg: "material-symbols:settings-outline"  
    target: _self
```

## 📄 其他页面功能

### 追番页面

- 集成 TMDB API 获取动漫元数据
- 支持 Bilibili 追番列表同步
- 实时搜索和筛选功能
- 按类型、评分排序

### 导航页面

- 分类资源导航
- 支持搜索和分类筛选
- 响应式卡片布局

### 静态页面

- **About 页面**: 个人简介、技术栈展示
- **Friends 页面**: 友链展示和站点展示
- **Projects 页面**: 个人项目展示

## 🙏 致谢

本项目基于以下优秀的博客模板开发：

- **Frosti**: 项目的核心基础，由 [EveSunMaple](https://github.com/EveSunMaple/Frosti) 开发
- **Yukina**: 部分设计巧思参考自 [WhitePaper233](https://github.com/WhitePaper233/yukina) 开发的模板
- **Mizuki**: 部分功能实现借鉴了 [matsuzaka-yuki](https://github.com/matsuzaka-yuki/Mizuki) 开发的模板
- **2025-blog-public**: 在线编辑文章，配置站点等功能借鉴了 [yysuni](https://github.com/YYsuni/2025-blog-public) 开发的项目

感谢所有开源社区的贡献者们！

## 📝 许可证

本项目采用 [MIT 许可证](https://app.devin.ai/search/LICENSE)。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

------
