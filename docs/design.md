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
| 前端 | Next.js 15 + Tailwind CSS |
| 后端 | FastAPI + uvicorn + yt-dlp + ffmpeg |
| 状态 | 内存 dict + `/tmp/videos/{jobId}/` |
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
| `/` | Navbar, HeroSection, UrlInputBar, PlatformGrid, ProFeatureCards, Footer |
| `/download/[id]` | FormatPicker, ProgressBar, MobileTip |
| `/pricing` | 三档套餐卡片 |

### 响应式断点

- `< 640px`：单列
- `640–1024px`：双列
- `> 1024px`：三列，max-width 1200px

## 6. 目录结构

```
downloadapp/
├── docs/
│   ├── requirements.md
│   └── design.md
├── frontend/
│   ├── app/
│   ├── components/
│   └── lib/
├── backend/
│   ├── main.py
│   ├── services/ytdlp.py
│   ├── models/job.py
│   └── routers/api.py
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
└── README.md
```

## 7. 扩展点设计

### 7.1 付费钩子

- `ProFeatureCards` 组件预留 `onUpgrade` 回调
- 后端可扩展 `require_pro: bool` 字段限制 4K/批量
- 定价页 `/pricing` 已占位，后续接入支付网关

### 7.2 AI 接口预留

- 下载完成后 Job 可扩展 `transcript_path`、`summary` 字段
- 新增 `POST /api/jobs/{id}/summarize` 端点（Phase 3）

### 7.3 DB 迁移路径

- 当前：内存 Job + 文件系统
- Phase 3：SQLite 存储 users、subscriptions、download_logs
- Job 表结构可迁移为 `jobs(id, user_id, url, status, ...)`

## 8. 部署方案

### 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| MAX_CONCURRENT | 3 | 最大并发下载 |
| JOB_TTL_HOURS | 2 | Job 过期时间 |
| RATE_LIMIT | 10/hour | IP 解析限流 |
| TEMP_DIR | /tmp/videos | 临时文件目录 |
| CORS_ORIGINS | http://localhost:3000 | 前端域名 |

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
