# secrets/

运维侧密钥与 Cookie，**不要提交真实文件到 Git**。

## B站 / 抖音 Cookie

1. 在本机浏览器登录目标平台（建议专用小号）。
2. 用扩展导出 **Netscape** 格式的 `cookies.txt`（如 “Get cookies.txt LOCALLY”）。
3. 放到本目录：

```bash
cp ~/Downloads/cookies.txt ./secrets/cookies.txt
chmod 600 ./secrets/cookies.txt
```

4. 重启 backend 容器（或跑 `./scripts/upload-cookies.sh`）。

Docker 会把本目录只读挂到容器 `/secrets`，并设置 `COOKIES_FILE=/secrets/cookies.txt`。  
文件不存在时下载仍可用，只是 B站/抖音更容易被风控。

详见 `docs/deploy-online-guide.md`「B站 / 抖音 Cookie 运维」。
