import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import os from "node:os";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

/** 本机局域网 IPv4，方便 iOS 真机通过 VG_START_URL 访问 next dev。 */
function lanIPv4Hosts(): string[] {
  const hosts: string[] = [];
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === "IPv4" && !a.internal) hosts.push(a.address);
    }
  }
  return hosts;
}

const nextConfig: NextConfig = {
  output: "standalone",
  // 允许用 127.0.0.1 / 局域网 IP 访问本地开发服务器（iOS 真机联调）
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    ...lanIPv4Hosts(),
    ...(process.env.DEV_LAN_ORIGIN
      ? [process.env.DEV_LAN_ORIGIN.trim()]
      : []),
  ],
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
