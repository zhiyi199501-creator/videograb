import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import JsonLd from "@/components/seo/JsonLd";
import {
  HOME_DESCRIPTION,
  HOME_KEYWORDS,
  HOME_TITLE,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
} from "@/lib/site";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: HOME_TITLE,
    template: `%s - ${SITE_NAME} | ${SITE_TAGLINE}`,
  },
  description: HOME_DESCRIPTION,
  keywords: HOME_KEYWORDS,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} - ${SITE_TAGLINE}`,
    description:
      "支持 YouTube、B站、抖音等 1000+ 平台视频下载，AI 智能总结，多种清晰度可选，打开即用无需安装。",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - ${SITE_TAGLINE}`,
    description:
      "支持 YouTube、B站、抖音等 1000+ 平台视频下载，AI 智能总结，多种清晰度可选。",
  },
  other: {
    "format-detection": "telephone=no",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1677ff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <JsonLd />
        <meta itemProp="name" content={`${SITE_NAME} - ${SITE_TAGLINE}`} />
        <meta itemProp="description" content={HOME_DESCRIPTION} />
      </head>
      <body
        suppressHydrationWarning
        className={`${jakarta.variable} flex min-h-screen flex-col font-sans text-[#020817] antialiased`}
      >
        <Suspense>{children}</Suspense>
      </body>
    </html>
  );
}
