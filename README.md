# VideoGrab — 万能视频下载网站

基于 [yt-dlp](https://github.com/yt-dlp/yt-dlp) 的万能视频下载网站，支持 YouTube、B站、抖音、TikTok 等 1000+ 平台，手机也能下。前端采用清爽卡片风 + 付费转化设计，后端为轻量 FastAPI 薄封装（无数据库）。

## 功能特性

- 粘贴链接一键解析，选择清晰度/格式后下载
- 实时下载进度（SSE 推送）
- 移动端友好：`Content-Disposition` 直链下载 + 微信/Safari 提示
- 无数据库，内存 Job + 临时文件，2 小时 TTL 自动清理
- IP 限流（60 次/小时）防滥用
- Pro 功能占位（AI 总结 / 字幕翻译 / 批量 4K）与定价页

## 技术栈

| 层 | 选型 |
|----|------|
| 前端 | Next.js 16 + Tailwind CSS |
| 后端 | FastAPI + uvicorn + yt-dlp + ffmpeg |
| 状态 | 内存 Job Registry + `/tmp/videos` |
| 部署 | Docker Compose |

## 项目结构

```
downloadapp/
├── docs/              # 需求分析 + 方案设计文档（扩展前必读）
├── frontend/          # Next.js 前端
├── backend/           # FastAPI 后端
└── docker-compose.yml
```

## 本地开发

### 前置依赖

- Node.js 20+、Python 3.10+、ffmpeg

### 后端

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 前端

```bash
cd frontend
npm install                # 若默认源慢，可用: npm install --registry=https://registry.npmmirror.com
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

访问 http://localhost:3000

## Docker 一键启动

```bash
docker compose up --build
# 前端: http://localhost:3000
# 后端: http://localhost:8000
```

## 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `MAX_CONCURRENT` | 3 | 最大并发下载 |
| `JOB_TTL_HOURS` | 2 | Job 过期时间 |
| `TEMP_DIR` | /tmp/videos | 临时文件目录 |
| `CORS_ORIGINS` | http://localhost:3000 | 允许的前端域名 |
| `NEXT_PUBLIC_API_URL` | http://localhost:8000 | 前端调用的后端地址 |

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/extract` | 解析视频元数据，返回 jobId + 格式列表 |
| GET | `/api/jobs/{id}` | 查询任务状态 |
| GET | `/api/jobs/{id}/events` | SSE 进度推送 |
| POST | `/api/jobs/{id}/download` | 开始下载 |
| GET | `/api/jobs/{id}/file` | 下载文件（attachment） |
| DELETE | `/api/jobs/{id}` | 清理任务与文件 |

详见 [docs/design.md](docs/design.md)。

## 生产部署

- 云 VPS（2C4G+）+ Docker Compose
- Caddy / Nginx 反向代理 + HTTPS，支持大文件 Range 请求
- 按需配置限流与 TTL 环境变量

## 免责声明

本工具仅供个人学习与研究使用。用户应确保对所下载内容拥有合法权利，并遵守各平台服务条款。请勿用于侵犯版权或商业用途，由此产生的法律责任由用户自行承担。本服务不永久存储任何视频内容，临时文件将在 TTL 到期后自动删除。

## 开源许可

本项目基于 [yt-dlp](https://github.com/yt-dlp/yt-dlp)（[Unlicense](https://github.com/yt-dlp/yt-dlp/blob/master/LICENSE)）构建。分发时请遵守相关开源许可与各平台服务条款。
