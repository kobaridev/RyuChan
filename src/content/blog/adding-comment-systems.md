---
slug: adding-comment-systems
title: Adding Comment Systems to RyuChan
description: A comprehensive guide on how to integrate the Waline comment system into
  your RyuChan blog
pubDate: 2025-04-15T00:00
image: /image/image4.webp
badge: Comment
draft: false
categories:
- Documentation
tags:
- RyuChan
- Comments
- Waline
- Astro
---
## Introduction

RyuChan 博客现已支持通过配置文件集中管理评论系统，无需在页面手动引入组件或硬编码参数，只需在 `ryuchan.config.yaml` 中配置即可。

## 集中式评论系统配置

### 步骤 1：配置评论系统

在 `ryuchan.config.yaml` 中找到 `comments` 配置块：

```yaml
comments:
  enable: true         # 是否启用评论
  type: giscus        # 可选 giscus/waline/none
  giscus:
    repo: "xxx/xxx"
    repoId: "xxx"
    category: "General"
    categoryId: "xxx"
    mapping: "pathname"
    lang: "zh-CN"
    inputPosition: "top"
    reactionsEnabled: "1"
    emitMetadata: "0"
    loading: "lazy"
  waline:
    serverURL: "https://your-waline-server"
    lang: "zh-CN"
    emoji:
      - "https://unpkg.com/@waline/emojis@1.1.0/weibo"
      - "https://unpkg.com/@waline/emojis@1.1.0/bilibili"
    meta: ["nick", "mail", "link"]
    requiredMeta: []
    reaction: false
    pageview: false
```

- `enable: true/false` 控制是否全站显示评论。
- `type: giscus/waline/none` 控制评论系统类型，**同一时间只会启用一个**。
- 详细参数请参考各自官方文档。

### 步骤 2：自动渲染，无需手动引入

你无需在页面或模板中手动引入 `<Giscus />` 或 `<Waline />` 组件，Ryuchan 已自动根据配置渲染对应评论系统。只需专注于内容创作和配置维护。

### 步骤 3：切换或禁用评论系统

- 切换评论系统：只需修改 `type` 字段为 `giscus` 或 `waline`，保存后自动生效。
- 禁用评论系统：将 `enable` 设为 `false` 即可。

---

## 进阶：自定义 Waline 组件

如需自定义 Waline 组件样式或参数，可参考如下代码（已内置于 RyuChan）：

```astro
---
// src/components/comments/Waline.astro
interface Props {
  serverURL: string;
  lang?: string;
  dark?: string;
  emoji?: string[];
  meta?: string[];
  requiredMeta?: string[];
  reaction?: boolean;
  pageview?: boolean;
}
const {
  serverURL,
  lang = "zh-CN",
  dark = "html[data-theme-type='dark']",
  emoji = ["https://unpkg.com/@waline/emojis@1.1.0/weibo", "https://unpkg.com/@waline/emojis@1.1.0/bilibili"],
  meta = ["nick", "mail", "link"],
  requiredMeta = [],
  reaction = false,
  pageview = false,
} = Astro.props;
---
<div id="waline-container"></div>
<link rel="stylesheet" href="https://unpkg.com/@waline/client@v3/dist/waline.css" />
<script type="module" define:vars={{
  serverURL, lang, dark, emoji, meta, requiredMeta, reaction, pageview,
}}>
  import { init } from "https://unpkg.com/@waline/client@v3/dist/waline.js";
  let walineInstance;
  async function mountWaline() {
    if (walineInstance) await walineInstance.destroy();
    walineInstance = init({
      el: "#waline-container",
      serverURL, path: location.pathname, lang, dark, emoji, meta, requiredMeta, reaction, pageview,
    });
  }
  document.addEventListener("astro:after-swap", mountWaline);
  document.addEventListener("DOMContentLoaded", mountWaline);
</script>
<style>
  #waline-container { margin-top: 2rem; margin-bottom: 2rem; }
</style>
```

---

## 常见问题

- **评论不显示**：请检查配置文件参数是否正确，Waline/Giscus 服务端是否可访问。
- **切换无效**：确认已保存配置文件并重启开发服务。
