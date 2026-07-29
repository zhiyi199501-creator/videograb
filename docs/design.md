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
| 前端 | Next.js 16 + Tailwind CSS + marked + markmap |
| 后端 | FastAPI + uvicorn + yt-dlp + ffmpeg + DeepSeek + faster-whisper |
| 状态 | 内存 Job + `/tmp/videos/{jobId}/`；用户/订阅 SQLite |
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

| 路径 | 组件 |
|------|------|
| `/` | Navbar, HomeContent（居中搜索 + 平台标签）, Footer |
| `/download/[id]` | 左右同屏：左 40% 视频信息/下载，右 60% SummaryPanel（有 AI 额度时自动总结）；移动端上下堆叠 |
| `/login` `/register` | 邮箱密码登录注册 |
| `/pricing/success` `/pricing/cancel` | Stripe 回跳页 |
| `/pricing` | Free / Pro 两档对比（Team 未做） |

### 下载页同屏布局

```
Desktop (lg+)
┌──────────────────────────────────────────────┐
│ ← 返回                                        │
│ ┌─────────────┬────────────────────────────┐ │
│ │ 40% 视频信息 │ 60% AI 总结（有额度则自动） │ │
│ │ 缩略图/格式  │ 摘要/字幕/导图/问答         │ │
│ │ 下载按钮     │ 重新生成（执行中禁用）       │ │
│ └─────────────┴────────────────────────────┘ │
└──────────────────────────────────────────────┘
Mobile: 上下堆叠
```

### 首页紧凑 / 演示模式

- 默认：标题 + 搜索框垂直居中，下方仅保留平台标签；弱化 Slogan 副文案
- 连按三次 Enter（焦点不在输入框）：展开完整 Slogan 副文案
- 首页不再展示 Pro 功能列表（定价见 `/pricing`）

### 响应式断点

- `< 1024px`：下载页单列堆叠
- `≥ 1024px`：下载页左右 40% / 60%
- 首页 max-width 约 672px（输入区）；下载页 max-width 72rem（`max-w-6xl`）

## 6. 目录结构

```
downloadapp/
├── docs/                 # requirements / design / ai-summary / membership / stripe-setup
├── frontend/             # Next.js（含 Dockerfile）
│   ├── app/
│   ├── components/
│   └── lib/
├── backend/              # FastAPI（含 Dockerfile）
│   ├── main.py / db.py
│   ├── models/job.py
│   ├── routers/          # api / summarize / auth / billing
│   └── services/         # ytdlp / summarizer / auth / users / billing …
├── docker-compose.yml
└── README.md
```

## 7. 扩展点设计

### 7.1 付费钩子

- 定价页 `/pricing` + Stripe Checkout / Customer Portal 已接入（见 membership.md）
- 后端可扩展更高清晰度 / 批量等 Pro 能力（当前 Pro 主要权益为无限 AI）
- 首页 `ProFeatureCards` 仍可作转化入口

### 7.2 AI 视频总结（已实现）

详见 [ai-summary.md](ai-summary.md)。需登录；登录用户免费 3 次，Pro 无限。有额度时下载页可自动触发，可手动重新生成。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/jobs/{id}/summarize` | SSE：`status` / `ping` / `subtitle` / `content` / `mindmap` / `done` |
| POST | `/api/jobs/{id}/chat` | body `{ "question": "..." }`，SSE 流式回答 |

Job 可缓存字段：`subtitles`、`subtitle_text`、`subtitle_source`、`summary`、`mindmap`。

字幕优先平台轨；无字幕时 `faster-whisper` ASR。环境变量：`DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL`、`WHISPER_MODEL`、`HF_ENDPOINT`。

前端扩展：`marked` + `@tailwindcss/typography` 渲染摘要；思维导图全屏与完整 PNG/SVG 导出；字幕下载 SRT/VTT/TXT。SSE 文本字段附 Base64 防字符丢失。下载页与总结同屏左右布局（40%/60%）；首页紧凑首屏，连按三次 Enter 切换演示模式。

### 7.3 用户 / 会员 / Stripe（已实现）

详见 [membership.md](membership.md)、[stripe-setup.md](stripe-setup.md)。

- SQLite：`users`（含 `ai_free_used`）/ `subscriptions` / `stripe_events` / `checkout_sessions`
- JWT 登录；Stripe Checkout 月付 Pro（¥9.9）；Webhook 幂等履约
- 登录用户免费 AI 总结 3 次；用尽后需 Pro（`require_ai_access` / `require_ai_access_and_consume`）
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
| CORS_ORIGINS | http://localhost:3000 | 前端域名 |
| DEEPSEEK_API_KEY | （空） | AI 总结必填 |
| DEEPSEEK_MODEL | deepseek-v4-flash | DeepSeek 模型 |
| WHISPER_MODEL | tiny | 无字幕 ASR 模型 |
| HF_ENDPOINT | https://hf-mirror.com | Whisper 权重镜像 |

### Docker Compose

```bash
docker compose up --build
# frontend: http://localhost:3000
# backend:  http://localhost:8000
```

### 生产部署

- 云 VPS 2C4G+
- Caddy/Nginx 反向代理 + HTTPS
- 环境变量配置限流与 TTL

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
