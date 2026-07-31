# VideoGrab — Agent 指引

万能视频下载站（yt-dlp）：粘贴链接解析 → 选格式下载；可选 AI 总结（字幕/ASR → DeepSeek → 导图/问答）；JWT 登录 + Stripe Pro。

## 怎么跑

```bash
./dev.sh
# 前端 http://localhost:3000 · 后端 http://localhost:8000 · Ctrl+C 一起停
# 需 ffmpeg；AI 需 backend/.env 的 DEEPSEEK_API_KEY（无 .env 时脚本会从 .env.example 复制）

# Docker 本地：docker compose up --build
# 生产：docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

测试与 CI 命令见 README「测试与 CI」。Stripe Webhook：`docs/stripe-setup.md`。上线：`docs/deploy-online-guide.md`。服务器拉代码重建：`./scripts/redeploy.sh --pull`。

## 技术栈

- 前端：Next.js 16 + Tailwind + marked + markmap
- 后端：FastAPI；下载 Job 内存 + `/tmp/videos`；用户/订阅 SQLite（`backend/data/app.db`）
- AI：DeepSeek + faster-whisper；会员：Stripe Checkout 月付 Pro ¥9.9
- 部署：Docker Compose + Caddy 反代（海外机免备案）
- 测试：后端 pytest；前端 Vitest + lint/typecheck/build；GitHub Actions 三 job

## 目录与约定

- `docs/` 权威说明：`requirements.md`、`design.md`、`ai-summary.md`、`membership.md`、`stripe-setup.md`、`deploy-online-guide.md`
- `docker-compose.yml` = 通用默认；`docker-compose.prod.yml` = 正式域名 / CORS / FRONTEND_URL
- `backend/routers/`：`api` 下载、`summarize` AI、`auth`、`billing`；`backend/tests/` 单测
- `frontend/components/summary/`：AI 面板；定价仅 Free/Pro（无 Team）；`frontend/lib/*.test.ts` 单测
- `.github/workflows/ci.yml`：`frontend` / `backend` / `docker`；合入 `main` 须 PR 且三检全绿
- 密钥只放 `backend/.env`（参考 `.env.example`），勿提交；cookies 勿提交

## 现役产品事实（易过期处）

- 线上站点：`https://videograb.codedance.work`（主域名 `codedance.work` 子域；服务器新加坡）
- AI：**登录**后免费 **3** 次总结（`ai_free_used`）；Pro 无限。`summarize` 扣次，`chat` 只校验
- 解析 IP 限流：**60/hour**（代码硬编码，非 env）
- Job TTL 默认 2h；不持久化视频
- Docker 前端须构建时 `BACKEND_URL=http://backend:8000`，且 `NEXT_PUBLIC_API_URL` 留空（走同源 `/api`）
- 健康检查在后端 `GET /health`（未挂在公开 `/api` 前缀下）；站点首页与 `/api/*` 业务路由为用户面
- `main` 分支保护已开：禁止 force push/删除；必过 CI；管理员也不可绕过（恢复脚本：`./scripts/enable-main-branch-protection.sh`）

## 本地坑（易复发）

- 仓库路径搬迁后若 `backend/.venv` 的 shebang 仍指向旧路径 → `rm -rf backend/.venv && ./dev.sh`
- 跳转 `/download/[id]` 失败或 Turbopack `Next.js package not found` → `rm -rf frontend/.next` 后重启 `./dev.sh`，浏览器硬刷新
- 本机若仍是 Python 3.9，yt-dlp 会告警；README/Docker/CI 目标为 3.12（镜像与 Actions）
- 生产容器内勿用 `COOKIES_FROM_BROWSER=chrome`；B站/抖音需 `COOKIES_FILE`

## 当前状态 / 下一步

- 已上（产品）：下载、AI 总结、登录、Stripe Pro、SEO、海外 Docker + HTTPS 子域名
- 已上（工程）：pytest / Vitest / GitHub Actions CI、`main` 分支保护（2026-07-31）
- 生产代码相对 `origin/main` 可能滞后一拍：合入 ≠ 已部署；改运行态后服务器执行 `./scripts/redeploy.sh --pull`
- 未做：字幕翻译、批量/历史、Team、Job 挂 user_id；B站/抖音 Cookie 运维方案；公开 `/health` 反代（非必须）
- 扩展前先读对应 `docs/*`；以代码为准修正文档，勿双写矛盾说法
