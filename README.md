# VideoGrab — 万能视频下载网站

基于 [yt-dlp](https://github.com/yt-dlp/yt-dlp) 的万能视频下载网站，支持 YouTube、B站、抖音、TikTok 等 1000+ 平台，手机也能下。前端采用清爽卡片风 + 付费转化设计；后端为轻量 FastAPI（下载 Job 在内存，用户/订阅用 SQLite）。

## 功能特性

- 粘贴链接一键解析，选择清晰度/格式后下载
- 实时下载进度（SSE 推送）；下载完成后自动唤起浏览器保存
- **AI 视频总结**（解析后自动触发，可重新生成）：字幕提取 / 无字幕语音转写 → DeepSeek 流式摘要 → 思维导图 → 智能问答
  - Markdown 精美排版；思维导图全屏与 PNG/SVG 导出；字幕下载 SRT / VTT / TXT
  - 下载页与总结左右同屏；首页紧凑首屏（连按三次 Enter 展开演示 Slogan）
- 移动端友好：`Content-Disposition` 直链下载 + 微信/Safari 提示
- 无独立下载数据库：内存 Job + 临时文件，2 小时 TTL 自动清理；用户/订阅另用 SQLite
- IP 限流（解析 60 次/小时）防滥用
- **用户登录 + Stripe Pro 会员**（登录免费 AI 3 次，Pro ¥9.9/月无限；见 docs/membership.md）
- 定价页 Free / Pro（Team 未做）

## 技术栈

| 层 | 选型 |
|----|------|
| 前端 | Next.js 16 + Tailwind CSS + marked + typography + markmap |
| 后端 | FastAPI + uvicorn + yt-dlp + ffmpeg + DeepSeek + faster-whisper |
| 状态 | 内存 Job Registry + `/tmp/videos`；用户/订阅用 SQLite |
| 部署 | Docker Compose |

## 项目结构

```
videograb/
├── AGENTS.md                 # Agent 指引（怎么跑 / 现役产品事实）
├── dev.sh                    # 本地一键启动前后端
├── docs/                     # 需求 / 设计 / 会员 / 上线教程等（扩展前必读）
├── scripts/                  # 服务器初始化 / 重建 / 重载 HTTPS 脚本
├── frontend/                 # Next.js 前端
├── backend/                  # FastAPI 后端
├── docker-compose.yml        # Docker 通用默认
└── docker-compose.prod.yml   # 生产覆盖（正式域名 / CORS / FRONTEND_URL）
```

## 本地开发

### 前置依赖

- Node.js 20+、Python 3.10+、ffmpeg
- AI 总结需 [DeepSeek API Key](https://platform.deepseek.com/api_keys)；无字幕视频首次转写会下载 Whisper 模型

### 一键启动

```bash
./dev.sh
```

会自动激活 `backend/.venv`、按需装依赖，并同时启动前后端。Ctrl+C 一起停。

- 前端: http://localhost:3000
- 后端: http://localhost:8000

### 分开启动（可选）

**后端**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

**前端**

```bash
cd frontend
npm install                # 若默认源慢，可用: npm install --registry=https://registry.npmmirror.com
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

## 测试与 CI

合入 `main` 须走 **Pull Request**，且 GitHub Actions 三门禁全绿：`frontend` / `backend` / `docker`。

默认 CI **不**跑真实 yt-dlp 下载、Whisper ASR、Stripe Checkout 或 DeepSeek 调用（避免密钥依赖与 flaky）。

### 本地：后端

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
JWT_SECRET=ci-test-secret-min-32-chars-long!! pytest -q
```

### 本地：前端

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm test
NEXT_PUBLIC_API_URL= NEXT_PUBLIC_SITE_URL=https://example.com BACKEND_URL=http://127.0.0.1:8000 npm run build
```

### CI 覆盖范围

| Job | 内容 |
|-----|------|
| `frontend` | Node 20：`lint` → `typecheck` → Vitest → `build` |
| `backend` | Python 3.12：pytest（auth / users / JobStore URL 助手 / 字幕解析 / webhook 幂等） |
| `docker` | `docker compose build`（用 `.env.example` 生成临时 `.env`） |

合入门禁（`main` **已启用**）：须 PR、管理员也不可绕过、禁止 force push / 删除，且 `frontend` / `backend` / `docker` 必须通过。若保护规则被改坏，仓库管理员可再跑：

```bash
./scripts/enable-main-branch-protection.sh
```

## Docker 一键启动

本地 / 通用默认：

```bash
docker compose up --build
# 前端: http://localhost:3000
# 后端: http://localhost:8000
```

生产（叠加域名等覆盖，见 `docker-compose.prod.yml`）：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

更完整的海外上线步骤见 [docs/deploy-online-guide.md](docs/deploy-online-guide.md)。

## 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `MAX_CONCURRENT` | 3 | 最大并发下载 |
| `JOB_TTL_HOURS` | 2 | Job 过期时间 |
| `TEMP_DIR` | /tmp/videos | 临时文件目录 |
| `CORS_ORIGINS` | http://localhost:3000 | 允许的前端域名 |
| `NEXT_PUBLIC_API_URL` | （空，同源 `/api`） | 前端 API 基址；Docker 生产建议留空，由 Next rewrites 代理 |
| `NEXT_PUBLIC_SITE_URL` | https://videograb.lianxi.com | 站点域名（SEO canonical / sitemap / OG）；生产用 `docker-compose.prod.yml` 覆盖 |
| `BACKEND_URL` | http://backend:8000 | Next 服务端代理目标（构建时写入）；勿写成容器内的 127.0.0.1 |
| `DEEPSEEK_API_KEY` | （空） | AI 总结必填，见 `backend/.env.example` |
| `DEEPSEEK_MODEL` | deepseek-v4-flash | DeepSeek 模型 ID |
| `WHISPER_MODEL` | tiny | 无字幕时 ASR 模型 |
| `ASR_MAX_DURATION` | 1800 | ASR 最长秒数 |
| `JWT_SECRET` | （开发默认弱密钥） | 生产必改 |
| `STRIPE_SECRET_KEY` | （空） | Stripe Secret Key |
| `STRIPE_WEBHOOK_SECRET` | （空） | Webhook 签名密钥 |
| `STRIPE_PRICE_PRO` | （空） | Pro 月付 Price ID |
| `FRONTEND_URL` | http://localhost:3000 | Checkout 回跳域名 |
| `DATABASE_PATH` | backend/data/app.db | SQLite 路径 |

后端本地开发请复制环境变量文件：

```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env，填入 DEEPSEEK_API_KEY
```

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/extract` | 解析视频元数据，返回 jobId + 格式列表 |
| GET | `/api/jobs/{id}` | 查询任务状态 |
| GET | `/api/jobs/{id}/events` | SSE 进度推送 |
| POST | `/api/jobs/{id}/download` | 开始下载 |
| GET | `/api/jobs/{id}/file` | 下载文件（attachment） |
| GET | `/api/jobs/{id}/summarize` | SSE：字幕 + AI 摘要 + 思维导图 |
| POST | `/api/jobs/{id}/chat` | SSE：基于字幕的 AI 问答 |
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| GET | `/api/auth/me` | 当前用户与会员状态 |
| POST | `/api/billing/checkout` | 创建 Stripe Checkout |
| POST | `/api/billing/portal` | Stripe 账单门户 |
| POST | `/api/billing/webhook` | Stripe Webhook |
| DELETE | `/api/jobs/{id}` | 清理任务与文件 |

会员与支付详见 [docs/membership.md](docs/membership.md)、[docs/stripe-setup.md](docs/stripe-setup.md)。
详见 [docs/design.md](docs/design.md)、[docs/ai-summary.md](docs/ai-summary.md)、[docs/deploy-online-guide.md](docs/deploy-online-guide.md)。

## 生产部署

- 云 VPS（2C4G+）+ Docker Compose
- 使用 `docker-compose.yml` + `docker-compose.prod.yml`（域名 / CORS / FRONTEND_URL）
- Caddy / Nginx 反向代理 + HTTPS，支持大文件 Range 请求与 SSE
- 按需配置限流与 TTL；密钥只放 `backend/.env`，勿提交 Git
- 详细步骤：[docs/deploy-online-guide.md](docs/deploy-online-guide.md)

## 免责声明

本工具仅供个人学习与研究使用。用户应确保对所下载内容拥有合法权利，并遵守各平台服务条款。请勿用于侵犯版权或商业用途，由此产生的法律责任由用户自行承担。本服务不永久存储任何视频内容，临时文件将在 TTL 到期后自动删除。

## 开源许可

本项目基于 [yt-dlp](https://github.com/yt-dlp/yt-dlp)（[Unlicense](https://github.com/yt-dlp/yt-dlp/blob/master/LICENSE)）构建。分发时请遵守相关开源许可与各平台服务条款。
