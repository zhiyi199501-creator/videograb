# VideoGrab iOS

WKWebView 壳 App：加载线上站点 `https://videograb.codedance.work`，与 Web 功能同步。下载经原生桥接到系统分享面板；Stripe 结账跳转 Safari。

## 打开与运行

1. 用 Xcode 打开 `ios/VideoGrab.xcodeproj`
2. Signing & Capabilities → 选择你的 Team（Bundle ID：`work.codedance.videograb`，可按需改）
3. 选模拟器或真机 → Run

本地联调前端时，在 Xcode Scheme → Run → Arguments → Environment Variables 加：

```
VG_START_URL = http://127.0.0.1:3000
```

真机请改成电脑局域网 IP（如 `http://192.168.1.8:3000`）。

## 上架前清单

- [ ] 替换 `Assets.xcassets/AppIcon` 为正式 1024×1024 图标
- [ ] 填 `DEVELOPMENT_TEAM` / App Store Connect 应用
- [ ] 部署含 `nativeApp` 桥接的前端到生产（否则 App 内下载仍可能失败）
- [ ] App Privacy / 审核备注：说明为官网 Web 壳；付费走 Stripe（Safari）
- [ ] 评估 Guideline 3.1.1（数字内容 IAP）与下载类用途审核风险

## 原生桥

| Handler | 用途 |
|---------|------|
| `vgDownload` | `{ jobId, filename, token?, apiBase? }` → URLSession 下载后分享 |
| `vgOpenExternal` | `{ url }` → 系统浏览器（Stripe） |
| `vgShareBlob` | `{ filename, base64, mimeType? }` → 小文件分享 |

Web 侧见 `frontend/lib/nativeApp.ts`。
