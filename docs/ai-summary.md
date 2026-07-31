# AI 视频总结功能说明

> 字幕提取（或语音转写）→ DeepSeek 流式摘要 → markmap 思维导图 → 基于字幕的问答。  
> **需登录**。登录用户免费 **3** 次总结；Pro 无限。有额度时解析成功后可**自动触发**；仍可手动「重新生成」（执行中禁用）。无额度时下载页展示登录/升级引导。

## 用户流程

1. 首页粘贴链接 → 解析成功进入下载页
2. 已登录且有额度：可自动开始，或点击「AI 视频总结」/「重新生成」
3. `GET /api/jobs/{id}/summarize` 以 SSE 推送进度与结果（非 Pro 每次成功开始扣 1 次免费额度）
4. 可在 Tab 中查看摘要 / 字幕 / 思维导图，或进行问答（`chat` 校验额度但不扣次）
5. 字幕可下载为 SRT / VTT / TXT；思维导图支持全屏与 PNG / SVG 导出
6. 下载页与总结左右同屏（约 40% : 60%）

## SSE 事件

| 事件 | 说明 |
|------|------|
| `status` | 进度文案（含语音转写 / 思维导图等待秒数） |
| `ping` | 心跳，防止代理缓冲导致前端卡住（ASR 与导图生成阶段均会推送） |
| `subtitle` | 字幕全文 + `segments`（含起止时间，供下载） |
| `content` | 摘要增量（delta）；另附 `delta_b64` 防字符丢失 |
| `mindmap` | 思维导图 Markdown（附 `markdown_b64`） |
| `done` / `error` | 结束 |

问答：`POST /api/jobs/{id}/chat`，body `{ "question": "..." }`，同样 SSE 流式返回。

### SSE 字符保真

后端将文本字段同时以明文 + Base64（`*_b64`）写入单行 JSON；前端优先用 Base64 解包，并仅按 SSE 规范去掉 `data:` 后可选的一个空格（不再 `.trim()` 整行），避免 Markdown 空格 / 换行 / `*` 丢失。

## 字幕策略

| 平台 | 方式 |
|------|------|
| B 站 | `view` 取 cid → `dm/view` JSON（遇 -429 退避重试）→ 字幕 JSON；失败再试 `player/v2` |
| 其他 | yt-dlp `subtitles` / `automatic_captions` → VTT / json3 |
| 无字幕 | 下载音频 + **faster-whisper** 转写（默认模型 `tiny`，**自动检测语种**） |

- 文本截断约 15000 字
- 结果缓存到 Job：`subtitle_text` / `subtitles` / `subtitle_source`
- 同一 job 并发总结共用一次提取，避免重复 ASR
- 前端可将 `segments` 导出为 **SRT / VTT / TXT**（文件名取视频标题）
- 下载使用 `application/octet-stream` Blob，避免浏览器把 `text/*` 强制存成 `.txt`

## DeepSeek

| 项 | 值 |
|----|-----|
| base_url | `https://api.deepseek.com` |
| 默认模型 | `deepseek-v4-flash`（`DEEPSEEK_MODEL` 可覆盖） |
| API Key | `DEEPSEEK_API_KEY`（见 `backend/.env.example`） |

## 相关环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `DEEPSEEK_API_KEY` | （空） | 必填 |
| `DEEPSEEK_MODEL` | deepseek-v4-flash | 聊天模型 |
| `DEEPSEEK_COMPLETE_TIMEOUT` | 120 | 非流式（思维导图）最长等待秒数 |
| `DEEPSEEK_HTTP_TIMEOUT` | 120 | OpenAI 客户端 HTTP 超时（秒） |
| `WHISPER_MODEL` | tiny | faster-whisper 模型（tiny 更快，base/small 更准） |
| `ASR_LANGUAGE` | auto | 空/auto=自动检测；可强制 `en` / `zh`（勿对英文视频写死 zh） |
| `ASR_MAX_DURATION` | 1800 | 单次 ASR 最长秒数；超过则只转写前 N 分钟 |
| `HF_ENDPOINT` | https://hf-mirror.com | HuggingFace 镜像（拉取 Whisper 权重） |

## 前端

- `SummaryPanel`：`can_use_ai` 时 `autoStart` 可自动总结；摘要 / 字幕 / 思维导图 / 问答；保留「重新生成」（执行中禁用）
- `MarkdownContent`：`marked` + `@tailwindcss/typography`（`prose`）渲染摘要与问答
- `MindMapView`：`markmap-lib` + `markmap-view`；全屏；完整内容 PNG（2.5x）/ SVG 导出（不受当前缩放平移影响）
- 下载页：左右同屏（左 40% 视频信息，右 60% 总结），移动端上下堆叠
- 首页：标题与搜索垂直居中；连按三次 Enter 展开 Slogan 副文案
- SSE：`fetch` + `ReadableStream`（非 EventSource）；Base64 解包
- 开发预览：`/dev/summary-preview`（固定样例，无需总结视频）
- 下载页内容区 `max-w-6xl`，便于同屏阅读

## 后端模块

| 文件 | 职责 |
|------|------|
| `services/subtitle.py` | B 站 / yt-dlp 字幕 |
| `services/asr.py` | 无字幕时音频转写 |
| `services/deepseek.py` | DeepSeek 流式/非流式调用 |
| `services/summarizer.py` | 编排 + SSE 事件 + 心跳 |
| `services/auth.py` / `users.py` | JWT、`can_use_ai`、免费次数扣减 |
| `routers/summarize.py` | `/summarize`、`/chat`；SSE 封装与 Base64 |

## 验收建议

| 场景 | 示例 |
|------|------|
| 有字幕 | `https://www.bilibili.com/video/BV1mAAmzqEfP` |
| 无字幕（走 ASR） | `https://www.bilibili.com/video/BV1SNgS6EExv` |
| UI 预览 | 打开 `/dev/summary-preview` 测 Markdown / 导图导出 |

本地需已安装 `ffmpeg`，并配置 `backend/.env` 中的 `DEEPSEEK_API_KEY`。
