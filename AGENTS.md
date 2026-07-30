# VideoGrab — Agent 指引

万能视频下载站（yt-dlp）：粘贴链接解析 → 选格式下载；可选 AI 总结（字幕/ASR → DeepSeek → 导图/问答）；JWT 登录 + Stripe Pro。

## 怎么跑

```bash
./dev.sh
# 前端 http://localhost:3000 · 后端 http://localhost:8000 · Ctrl+C 一起停
# 需 ffmpeg；AI 需 backend/.env 的 DEEPSEEK_API_KEY（无 .env 时脚本会从 .env.example 复制）

# 或：docker compose up --build
```

Stripe 本地测 Webhook：见 `docs/stripe-setup.md`（`stripe listen --forward-to localhost:8000/api/billing/webhook`）。分开起前后端的命令见 README「分开启动」。

## 技术栈

- 前端：Next.js 16 + Tailwind + marked + markmap
- 后端：FastAPI；下载 Job 内存 + `/tmp/videos`；用户/订阅 SQLite（`backend/data/app.db`）
- AI：DeepSeek + faster-whisper；会员：Stripe Checkout 月付 Pro ¥9.9

## 目录与约定

- `docs/` 为权威产品/架构说明（改行为先对文档）：`requirements.md`、`design.md`、`ai-summary.md`、`membership.md`、`stripe-setup.md`
- `backend/routers/`：`api` 下载、`summarize` AI、`auth`、`billing`
- `frontend/components/summary/`：AI 面板；定价仅 Free/Pro（无 Team）
- 密钥只放 `backend/.env`（参考 `.env.example`），勿提交

## 现役产品事实（易过期处）

- AI：**登录**后免费 **3** 次总结（`ai_free_used`）；Pro 无限。`summarize` 扣次，`chat` 只校验。
- 解析 IP 限流：**60/hour**（代码硬编码，非 env）
- Job TTL 默认 2h；不持久化视频

## 本地坑（易复发）

- 仓库路径搬迁后若 `backend/.venv` 的 shebang 仍指向旧路径 → 删掉重建：`rm -rf backend/.venv && ./dev.sh`
- 跳转 `/download/[id]` 失败或 Turbopack `Next.js package not found` → `rm -rf frontend/.next` 后重启 `./dev.sh`，浏览器硬刷新
- 本机若仍是 Python 3.9，yt-dlp 会告警；README/Docker 目标为 3.10+（镜像 3.12）

## 当前状态 / 下一步

- 已上：下载、AI 总结、登录、Stripe Pro、SEO
- 未做：字幕翻译、批量/历史、Team、Job 挂 user_id
- 扩展前先读对应 `docs/*`；以代码为准修正文档，勿双写矛盾说法
