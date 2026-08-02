import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const runtime = "edge";
export const alt = `${SITE_NAME} - ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 72,
          background:
            "linear-gradient(135deg, #f5f9fc 0%, #e8f1ff 45%, #dbeafe 100%)",
          color: "#0f172a",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#1677ff",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            V
          </div>
          <div style={{ fontSize: 36, fontWeight: 800 }}>{SITE_NAME}</div>
        </div>
        <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.2, maxWidth: 900 }}>
          万能视频下载，一键保存到本地
        </div>
        <div style={{ marginTop: 24, fontSize: 26, color: "#64748b", maxWidth: 860 }}>
          支持 YouTube、B站、抖音等 1000+ 平台 · AI 总结 · 手机也能下
        </div>
      </div>
    ),
    { ...size },
  );
}
