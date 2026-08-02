/**
 * 站点 SEO / GEO 公共配置。
 * 可通过 NEXT_PUBLIC_SITE_URL 覆盖（含 https，无尾斜杠）。
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"
).replace(/\/$/, "");

export const SITE_NAME = "VideoGrab";
