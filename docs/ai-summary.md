# AI 视频总结功能说明

> 字幕提取（或语音转写）→ DeepSeek 流式摘要 → markmap 思维导图 → 基于字幕的问答。  
> **需用户手动点击「AI 视频总结」**，解析成功后不会自动触发。

## 用户流程

1. 首页粘贴链接 → 解析成功进入下载页
2. 用户点击「AI 视频总结」
3. `GET /api/jobs/{id}/summarize` 以 SSE 推送进度与结果
4. 可在 Tab 中查看摘要 / 字幕 / 思维导图，或进行问答

## SSE 事件

| 事件 | 说明 |
|------|------|
| `status` | 进度文案（含语音转写等待秒数） |
| `ping` | 心跳，防止代理缓冲导致前端卡住 |
| `subtitle` | 字幕或转写全文 |
| `content` | 摘要增量（delta） |
| `mindmap` | 思维导图 Markdown |
| `done` / `error` | 结束 |

问答：`POST /api/jobs/{id}/chat`，body `{ "question": "..." }`，同样 SSE 流式返回。

## 字幕策略

| 平台 | 方式 |
|------|------|
| B 站 | `view` 取 cid → `dm/view` JSON（遇 -429 退避重试）→ 字幕 JSON；失败再试 `player/v2` |
| 其他 | yt-dlp `subtitles` / `automatic_captions` → VTT / json3 |
| 无字幕 | 下载音频 + **faster-whisper** 转写（默认模型 `tiny`） |

- 文本截断约 15000 字
- 结果缓存到 Job：`subtitle_text` / `subtitles` / `subtitle_source`
- 同一 job 并发总结共用一次提取，避免重复 ASR

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
| `WHISPER_MODEL` | tiny | faster-whisper 模型（tiny 更快，base/small 更准） |
| `ASR_MAX_DURATION` | 1800 | 语音转写最长秒数 |
| `HF_ENDPOINT` | https://hf-mirror.com | HuggingFace 镜像（拉取 Whisper 权重） |

## 前端

- `SummaryPanel`：手动触发；摘要 / 字幕 / 思维导图 / 问答
- `MindMapView`：`markmap-lib` + `markmap-view`
- SSE：`fetch` + `ReadableStream`（非 EventSource）
- 下载页内容区约 `max-w-4xl`，便于阅读摘要与导图

## 后端模块

| 文件 | 职责 |
|------|------|
| `services/subtitle.py` | B 站 / yt-dlp 字幕 |
| `services/asr.py` | 无字幕时音频转写 |
| `services/deepseek.py` | DeepSeek 流式/非流式调用 |
| `services/summarizer.py` | 编排 + SSE 事件 + 心跳 |
| `routers/summarize.py` | `/summarize`、`/chat` 路由 |

## 验收建议

| 场景 | 示例 |
|------|------|
| 有字幕 | `https://www.bilibili.com/video/BV1mAAmzqEfP` |
| 无字幕（走 ASR） | `https://www.bilibili.com/video/BV1SNgS6EExv` |

本地需已安装 `ffmpeg`，并配置 `backend/.env` 中的 `DEEPSEEK_API_KEY`。
