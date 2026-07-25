import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VideoGrab — 万能视频下载，一键保存到本地",
  description:
    "支持 YouTube、B站、抖音、TikTok 等 1000+ 平台的万能视频下载工具，手机也能下。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${jakarta.variable} flex min-h-screen flex-col font-sans text-[#020817] antialiased`}
      >
        <Suspense>{children}</Suspense>
      </body>
    </html>
  );
}
