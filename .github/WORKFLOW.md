# RyuChan 部署工作流

部署 RyuChan 前端仓，构建前自动 clone 内容仓（RyuChan-Content）并同步内容。

## 触发条件

- 推送到 main 分支时自动触发
- 内容仓（RyuChan-Content）推送时通过 repository_dispatch 触发

## Secrets 要求

- `CLOUDFLARE_API_TOKEN`: Cloudflare Pages 部署凭据
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare 账户 ID
- `CONTENT_TOKEN`: 内容仓访问凭据（私有仓时使用 Personal Access Token）

## 环境变量

- `PUBLIC_CONTENT_REPO_OWNER`: 内容仓 owner（默认 kobaridev）
- `PUBLIC_CONTENT_REPO`: 内容仓名称（默认 RyuChan-Content）
- `PUBLIC_CONTENT_REPO_BRANCH`: 内容仓分支（默认 main）

## 使用方式

### 1. 本地开发（内容仓在同一机器）

```bash
cd D:\Blog\RyuChan
CONTENT_REPO=D:\Blog\ryuchan-content pnpm dev
```

### 2. GitHub Actions（CI/CD）

推送代码到 main 分支自动触发部署。如需从内容仓触发重新部署：

```bash
# 使用 gh CLI 触发
gh workflow run deploy.yml --ref main
```

## 文件结构

- `.github/workflows/deploy.yml`: GitHub Actions 工作流定义
- `scripts/prebuild-content.mjs`: 内容同步脚本
- `wrangler.toml`: Cloudflare Pages 配置
