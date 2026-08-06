# 万能视频下载网站 — 方案设计文档

> 本文档供后续 AI 扩展功能时优先阅读，了解架构、API、UI 规范与扩展点。

## 1. 系统架构

```
┌─────────────┐     REST/SSE      ┌──────────────────┐
│  Next.js    │ ◄──────────────► │  FastAPI         │
│  Frontend   │                   │  + in-memory jobs│
└─────────────┘                   │  + /tmp storage  │
                                  └────────┬─────────┘
                                           │
                                  ┌────────▼─────────┐
                                  │  yt-dlp + ffmpeg │
                                  └──────────────────┘
```

### 技术栈

| 层 | 选型 |
|----|------|
| 前端 | Next.js 16 + Tailwind CSS + next-intl + marked + markmap |
| 后端 | FastAPI + uvicorn + yt-dlp + ffmpeg + DeepSeek + faster-whisper |
| 状态 | 内存 Job + `/tmp/videos/{jobId}/`；用户/订阅 SQLite |
| i18n | 15 语（默认 `zh`，`localePrefix: as-needed`）；`frontend/messages/` + `backend/i18n/` |
| 部署 | Docker Compose |

## 2. 核心业务流程

```
用户粘贴 URL
  → POST /api/extract（yt-dlp extract_info, skip_download=True）
  → 返回 jobId, title, thumbnail, formats[]
  → 用户选择 formatId
  → POST /api/jobs/{id}/download
  → yt-dlp download + progress_hooks 更新 Job
  → GET /api/jobs/{id}/events（SSE 推送 progress）
  → GET /api/jobs/{id}/file（Content-Disposition: attachment）
  → 用户保存到本地
```

## 3. Job 状态机

```
pending → extracting → ready → downloading → complete
                ↓           ↓         ↓
              failed      failed    failed
                ↓
            expired（TTL 2h 后台清理）
```

## 4. API 接口规范

### POST /api/extract

**Request:**
```json
{ "url": "https://www.youtube.com/watch?v=xxx" }
```

**Response:**
```json
{
  "job_id": "uuid",
  "status": "ready",
  "title": "视频标题",
  "thumbnail": "https://...",
  "duration": 120,
  "uploader": "频道名",
  "formats": [
    {
      "format_id": "137+140",
      "ext": "mp4",
      "resolution": "1080p",
      "filesize": 52428800,
      "vcodec": "avc1",
      "acodec": "mp4a",
      "label": "1080p MP4"
    }
  ]
}
```

### GET /api/jobs/{id}

**Response:**
```json
{
  "job_id": "uuid",
  "status": "downloading",
  "progress": 0.42,
  "title": "...",
  "error": null
}
```

### GET /api/jobs/{id}/events

SSE 流，事件格式：
```
data: {"status":"downloading","progress":0.42}
```

### POST /api/jobs/{id}/download

**Request:**
```json
{ "format_id": "137+140" }
```

### GET /api/jobs/{id}/file

返回视频文件流，`Content-Disposition: attachment; filename="..."`

### DELETE /api/jobs/{id}

清理临时文件与 Job 记录。

## 5. 前端 UI 规范

### 设计 Token

| Token | 值 |
|-------|-----|
| 背景色 | `#FFFFFF` |
| 主色 | `#1677ff` |
| 标题色 | `#0f172a` |
| 正文色 | `#020817` |
| 卡片圆角 | `12px` |
| 卡片阴影 | `0 4px 20px -4px rgba(0,0,0,0.05)` |
| Hero 标题 | `36px / font-weight 900` |
| 胶囊按钮 | `border-radius 9999px` |

参考站：[ai.codefather.cn/painting](https://ai.codefather.cn/painting)

### 页面结构

| 路径（默认语 `zh` 无前缀；其他如 `/en/...`） | 组件 |
|------|------|
| `/` | Navbar（含语言切换）, HomeContent（居中搜索 + 平台标签）, Footer |
| `/download/[id]` | 左右同屏：左 40% 视频信息/下载，右 60% SummaryPanel（解析成功后自动总结，全站免费）；移动端上下堆叠 |
| `/login` `/register` | 邮箱密码登录注册 |
| `/pricing*` | 重定向首页（Pro 自助入口已下线） |

### 下载页同屏布局

```
Desktop (lg+)
┌──────────────────────────────────────────────┐
│ ← 返回                                        │
│ ┌─────────────┬────────────────────────────┐ │
│ │ 40% 视频信息 │ 60% AI 总结（解析后自动）   │ │
│ │ 缩略图/格式  │ 摘要/字幕/导图/问答         │ │
│ │ 下载按钮     │ 重新生成（执行中禁用）       │ │
│ └─────────────┴────────────────────────────┘ │
└──────────────────────────────────────────────┘
Mobile: 上下堆叠
```

### 首页紧凑 / 演示模式

- 默认：标题 + 搜索框垂直居中，下方仅保留平台标签；弱化 Slogan 副文案
- 连按三次 Enter（焦点不在输入框）：展开完整 Slogan 副文案
- 首页不再展示 Pro 功能列表；定价自助入口已下线

### 响应式断点

- `< 1024px`：下载页单列堆叠
- `≥ 1024px`：下载页左右 40% / 60%
- 首页 max-width 约 672px（输入区）；下载页 max-width 72rem（`max-w-6xl`）

## 6. 目录结构

```
videograb/
├── docs/                 # requirements / design / ai-summary / membership / stripe-setup
├── frontend/             # Next.js（含 Dockerfile）
│   ├── app/[locale]/    # 页面按 locale 分区
│   ├── messages/         # 15 语 UI/SEO 文案
│   ├── i18n/             # routing / request / navigation
│   ├── middleware.ts
│   ├── components/
│   └── lib/
├── backend/              # FastAPI（含 Dockerfile）
│   ├── main.py / db.py
│   ├── i18n/             # API 错误文案（部分路由）
│   ├── models/job.py
│   ├── routers/          # api / summarize / auth / billing
│   └── services/         # ytdlp / summarizer / auth / users / billing …
├── docker-compose.yml
└── README.md
```

## 7. 扩展点设计

### 7.1 付费钩子

- 定价页 `/pricing` 已改为重定向首页；Stripe Checkout / Portal **后端仍保留**，前端自助入口已下线（见 membership.md）
- 现役下载权益：登录每天 **10** 次；已开通 Pro 的账号仍无限下载；AI 总结全站免费
- 首页不再引导至 `/pricing`

### 7.2 AI 视频总结（已实现）

详见 [ai-summary.md](ai-summary.md)。全站免费，无需登录。下载页解析成功后自动触发，可手动重新生成。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/jobs/{id}/summarize` | SSE：`status` / `ping` / `subtitle` / `content` / `mindmap` / `done` |
| POST | `/api/jobs/{id}/chat` | body `{ "question": "..." }`，SSE 流式回答 |

Job 可缓存字段：`subtitles`、`subtitle_text`、`subtitle_source`、`summary`、`mindmap`。

字幕优先平台轨；无字幕时 `faster-whisper` ASR（Compose 卷 `hf-cache` 持久化权重）。环境变量：`DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL`、`WHISPER_MODEL`；海外默认官方 Hub，`HF_ENDPOINT` 仅国内镜像时设置。

前端扩展：`marked` + `@tailwindcss/typography` 渲染摘要；思维导图全屏与完整 PNG/SVG 导出；字幕下载 SRT/VTT/TXT。SSE 文本字段附 Base64 防字符丢失。下载页与总结同屏左右布局（40%/60%）；首页紧凑首屏，连按三次 Enter 切换演示模式。

### 7.3 用户 / 会员 / Stripe（已实现）

详见 [membership.md](membership.md)、[stripe-setup.md](stripe-setup.md)。

- SQLite：`users`（含 `download_free_used` + `download_free_day`）/ `subscriptions` / `stripe_events` / `checkout_sessions`
- JWT 登录；下载额度每天 10 次；Stripe/人工 Pro 后端保留，前端自助入口已下线
- 下载需登录：非 Pro 每天免费 10 次（上海时区按日重置），Pro 无限（下载路由内扣次）；AI 总结全站免费；前端隐藏 Pro 自助升级
- Job 仍为内存；可后续挂 `user_id`

### 7.4 DB 迁移路径（后续）

- Job 表结构可迁移为 `jobs(id, user_id, url, status, ...)`
- 下载日志 `download_logs`

## 8. 部署方案

### 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| MAX_CONCURRENT | 3 | 最大并发下载 |
| JOB_TTL_HOURS | 2 | Job 过期时间 |
| （硬编码） | 60/hour | `POST /api/extract` IP 限流；总结/问答另有 20/30/hour |
| TEMP_DIR | /tmp/videos | 临时文件目录 |
| CORS_ORIGINS | http://localhost:3000,http://127.0.0.1:3000 | 前端域名；生产由 `docker-compose.prod.yml` 覆盖 |
| DEEPSEEK_API_KEY | （空） | AI 总结必填 |
| DEEPSEEK_MODEL | deepseek-v4-flash | DeepSeek 模型 |
| WHISPER_MODEL | tiny | 无字幕 ASR 模型 |
| HF_ENDPOINT | （空=官方 Hub） | 仅国内可设 `https://hf-mirror.com`；海外机勿设 |
| COOKIES_FILE | （Docker：`/secrets/cookies.txt`） | B站/抖音；见 `scripts/upload-cookies.sh` |
| BACKEND_URL | http://backend:8000（Docker）/ http://127.0.0.1:8000（本地 Next 默认） | Next rewrites 代理目标；**构建时写入** |
| NEXT_PUBLIC_API_URL | （空） | 留空走同源 `/api`；勿在生产 Docker 写 localhost |
| NEXT_PUBLIC_SITE_URL | 占位域名 | SEO；生产用 `docker-compose.prod.yml` 覆盖 |

### Docker Compose

本地 / 通用：

```bash
docker compose up --build
# frontend: http://localhost:3000
# backend:  http://localhost:8000
```

生产（域名覆盖）：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### 生产部署

- 云 VPS 2C4G+（海外节点免 ICP；本项目示例：新加坡）
- Caddy/Nginx 反向代理 + HTTPS（SSE 需关缓冲、拉长超时）
- 正式站点示例：`https://videograb.codedance.work`
- 保姆级步骤：`docs/deploy-online-guide.md`
- 密钥只放 `backend/.env`；换域名改 `docker-compose.prod.yml` + `.env` 后重建前端
- 合入 `main`：PR + CI（`frontend` / `backend` / `docker`）；本地与门禁命令见根 README「测试与 CI」。合入 ≠ 已部署，服务器用 `./scripts/redeploy.sh --pull`

## 9. yt-dlp 封装要点

```python
# 解析
opts = {"skip_download": True, "quiet": True, "no_warnings": True}
info = ydl.extract_info(url, download=False)

# 下载
opts = {
    "format": format_id or "bestvideo+bestaudio/best",
    "merge_output_format": "mp4",
    "outtmpl": f"{temp_dir}/{job_id}/%(title)s.%(ext)s",
    "progress_hooks": [progress_hook],
}
```

格式列表从 `info["formats"]` 筛选，暴露 resolution、ext、filesize，合并为用户友好 label。
