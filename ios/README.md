# VideoGrab iOS（AI 总结精简版）

WKWebView 壳 App，产品定位 **AI 视频总结**（字幕 / 导图 / 问答），**不提供视频文件下载**。

默认加载 `https://videograb.codedance.work`，通过注入 `window.VideoGrabNative.mode = 'ai-summary'` 让 Web 隐藏下载 UI。

## 打开与运行

1. Xcode 打开 `ios/VideoGrab.xcodeproj`
2. Signing → 选择 Team（Bundle ID：`work.codedance.videograb`）
3. Run（显示名：VideoGrab AI）

本地联调前端：Scheme → Run → Environment Variables：

```
VG_START_URL = http://127.0.0.1:3000
```

真机请改成电脑局域网 IP。**需部署含 `ai-summary` 桥接的前端**，否则壳仍显示网站下载 UI。

## 功能边界

| 有 | 无 |
|----|----|
| 粘贴链接解析 | 视频文件下载 / 分享面板存视频 |
| AI 总结、字幕、导图、问答 | 定价 / 下载额度入口 |
| 字幕与导图小文件分享（`vgShareBlob`） | Stripe 下载 Pro（壳内已隐藏） |

## 原生桥

| Handler | 用途 |
|---------|------|
| `vgOpenExternal` | 外链（如未来账号相关） |
| `vgShareBlob` | 字幕 / 导图导出分享 |

Web 侧：`frontend/lib/nativeApp.ts`、`useAiSummaryApp()`。

## 上架注意

- 审核话术按「AI 总结工具」写，勿强调下载
- 替换正式 App Icon；填 DEVELOPMENT_TEAM
- 生产前端必须先上线本分支的 AI-first 适配
