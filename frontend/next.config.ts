import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  // 允许用 127.0.0.1 访问本地开发服务器（避免强制 Next 16 跨域告警）
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // 同源代理：浏览器请求 /api/* 由 Next 转发到后端，绕过 CORS；
  // /health 一并代理，便于无 Caddy 时（本地 Docker）探活。
  async rewrites() {
    return [
      {
        source: "/health",
        destination: `${BACKEND_URL}/health`,
      },
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
