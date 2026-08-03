import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { SITE_NAME } from "@/lib/site";

export const alt = "VideoGrab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function OpenGraphImage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  const tSeo = await getTranslations({ locale, namespace: "seo" });

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
        <div
          style={{
            fontSize: 48,
            fontWeight: 900,
            lineHeight: 1.2,
            maxWidth: 960,
          }}
        >
          {`${t("heroTitleBefore")}${t("heroTitleAccent")}`}
        </div>
        <div
          style={{ marginTop: 24, fontSize: 24, color: "#64748b", maxWidth: 900 }}
        >
          {tSeo("tagline")}
        </div>
      </div>
    ),
    { ...size }
  );
}
