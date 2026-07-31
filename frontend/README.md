# Frontend（Next.js）

VideoGrab 前端。完整说明、环境变量与 API 见仓库根目录 [README.md](../README.md) 与 [docs/](../docs/)。

推荐在仓库根目录一键起前后端：`./dev.sh`。仅起前端时：

```bash
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

检查：`npm run lint && npm run typecheck && npm test`（完整 CI 说明见根 README「测试与 CI」）。

开发预览 AI 总结 UI：`/dev/summary-preview`。
