/**
 * 站点 SEO / GEO 公共配置。
 * 可通过 NEXT_PUBLIC_SITE_URL 覆盖（含 https，无尾斜杠）。
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"
).replace(/\/$/, "");

export const SITE_NAME = "VideoGrab";

export const SITE_TAGLINE = "免费在线万能视频下载器";

/** 首页 Title：核心词前置，约 50–60 字符 */
export const HOME_TITLE =
  "VideoGrab - 免费在线视频下载器 | 支持YouTube、B站、抖音等1000+平台";

export const HOME_DESCRIPTION =
  "VideoGrab 是免费在线万能视频下载工具，支持 YouTube、B站、抖音、TikTok、Instagram 等 1000+ 平台，可选多种清晰度，内置 AI 视频总结、思维导图与字幕下载，无需安装，手机也能用。立即免费体验。";

export const HOME_KEYWORDS = [
  "视频下载",
  "在线视频下载器",
  "YouTube下载",
  "B站视频下载",
  "抖音视频下载",
  "TikTok下载",
  "免费视频下载",
  "AI视频总结",
  "视频解析",
  "VideoGrab",
];

export const PRICING_TITLE =
  "定价方案 - VideoGrab | 免费与 Pro 视频下载套餐对比";

export const PRICING_DESCRIPTION =
  "查看 VideoGrab 免费版与 Pro 套餐对比：登录免费下载 3 次、AI 总结全站免费、Pro 无限次下载等能力一览。";

export const PRICING_KEYWORDS = [
  "VideoGrab定价",
  "视频下载会员",
  "AI视频总结价格",
  "在线下载器套餐",
  "Pro会员",
];

export const UPDATED_AT = "2026 年 7 月";
