# VideoGrab — Agent 指引

万能视频下载站（yt-dlp）：粘贴链接解析 → 选格式下载；可选 AI 总结（字幕/ASR → DeepSeek → 导图/问答）；JWT 登录。前端已隐藏 Pro 自助升级入口。

## 怎么跑

```bash
./dev.sh
# 前端 http://localhost:3000 · 后端 http://localhost:8000 · Ctrl+C 一起停
# 需 ffmpeg；AI 需 backend/.env 的 DEEPSEEK_API_KEY（无 .env 时脚本会从 .env.example 复制）

# Docker 本地：docker compose up --build
# 生产：docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

测试与 CI 见 README「测试与 CI」。Stripe 后端仍保留：`docs/stripe-setup.md`。上线：`docs/deploy-online-guide.md`。服务器重建：`./scripts/redeploy.sh --pull`。

## 技术栈

- 前端：Next.js 16 + Tailwind + next-intl + marked + markmap
- 后端：FastAPI；Job 内存 + `/tmp/videos`；用户/订阅 SQLite（`backend/data/app.db`）；`backend/i18n/` 错误文案
- AI：DeepSeek + faster-whisper（Compose 卷 `hf-cache`）
- 额度：登录用户每天 **10** 次免费下载（`download_free_used` + `download_free_day`，Asia/Shanghai 自然日重置）；后端仍保留 Pro/Stripe/人工 Pro
- iOS：`ios/VideoGrab.xcodeproj` WKWebView 壳，**AI 总结精简版**（`mode=ai-summary`，无视频下载 UI）；桥接见 `frontend/lib/nativeApp.ts`
- 部署：Docker Compose + Caddy（海外机）；测试：pytest / Vitest / GitHub Actions 三 job

## 目录与约定

- `docs/`：`requirements.md`、`design.md`、`ai-summary.md`、`membership.md`、`stripe-setup.md`、`deploy-online-guide.md`
- `ios/`：Xcode 工程；说明见 `ios/README.md`；Bundle ID `work.codedance.videograb`
- `frontend/messages/` + `frontend/i18n/`：15 语 UI/SEO；`backend/i18n/`：API 错误（`Accept-Language` / `?locale=`）
- `docker-compose.yml` 通用默认；`docker-compose.prod.yml` 正式域名 / CORS / FRONTEND_URL
- `backend/routers/`：`api` / `summarize` / `auth` / `billing` / `analytics` / `admin`；密钥只放 `backend/.env`，勿提交
- `secrets/cookies.txt` 勿提交；上传：`./scripts/upload-cookies.sh`（见 deploy §14.2）
- 合入 `main`：PR + CI 三检全绿；管理员也不可绕过保护

## 现役产品事实（易过期）

- 线上：`https://videograb.codedance.work`（新加坡）；`GET /health` 由 Caddy 直达后端（不经前端）
- AI：总结/问答全站免费，未登录也可用，不扣次。下载：未登录不能下载；登录用户每天 **10** 次（`DOWNLOAD_FREE_LIMIT=10`，按日重置）；前端 **隐藏** Pro 注册/定价入口（PC 与 iOS 一致）；后端 Pro/Stripe 代码仍在，人工 Pro 仍可经 admin
- i18n：默认 `zh`，`localePrefix: as-needed`；非中文路径如 `/en/...`。summarize 路由/SSE 状态已本地化；subtitle/ASR 底层错误文案仍多为中文
- 解析限流 60/hour（硬编码）；Job TTL 默认 2h；视频不持久化
- 用户表：`download_free_used` + `download_free_day`；无 AI 次数字段
- Docker 前端构建：`BACKEND_URL=http://backend:8000`，`NEXT_PUBLIC_API_URL` 留空
- Cookie：生产勿用 `COOKIES_FROM_BROWSER`；`COOKIES_FILE=/secrets/cookies.txt`（只读挂载，yt-dlp 用可写副本）
- ASR：海外勿设 `HF_ENDPOINT`（默认官方 Hub）；国内才用镜像
- Stripe：生产仍为 **Test Mode** + Webhook（后端保留）；自助 Checkout 入口已从前端下线；`/pricing*` 重定向首页
- 后台（代码在分支/PR，**生产未上**）：`/admin`；`ADMIN_EMAILS` 白名单 + JWT；`/api/admin/*`；`pageviews` / `auth_events`；人工 Pro；psutil 系统页（容器视角）
- 合入 ≠ 已部署；改运行态后服务器 `./scripts/redeploy.sh --pull`（生产目录 `/opt/videograb`）

## 本地坑

- `.venv` shebang 指旧路径 → `rm -rf backend/.venv && ./dev.sh`
- Turbopack / Next package not found → `rm -rf frontend/.next` 后重启并硬刷新
- 本机 Python 3.9 会让 yt-dlp 告警；目标 3.12
- 缺 `next-intl` → 在 `frontend/` 跑 `npm install` 后再 `./dev.sh`

## 当前状态 / 下一步

- 已上（生产 live 2026-08-05 核验）：下载、AI 总结、登录、SEO、Cookie 运维、导图 SSE、ASR HF 缓存、15 语 i18n；`GET /health` → 200。生产 git 仍停在较旧 `main`（当时核验为 `86e1a21`），落后 `origin/main`
- 进行中（未合入 / 未部署）：[PR #18](https://github.com/zhiyi199501-creator/videograb/pull/18) `/admin` 后台；分支上还有 iOS 壳 + **每日 10 次额度 / 隐藏 Pro 入口**（需部署后端+前端后才对用户生效）
- 进行中：iOS **VideoGrab AI** 精简壳（`ios/`，AI 总结优先、壳内无视频下载）；需部署含 `ai-summary` / 额度文案的前端
- 未做：字幕翻译、批量/历史、Team、Job 挂 user_id；Stripe **Live** / 是否永久下线自助 Pro；subtitle/ASR 底层错误全量 i18n；业务漏斗埋点
- 扩展前读对应 `docs/*`；以代码为准修正文档，勿双写矛盾
