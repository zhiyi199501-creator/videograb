import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

/** 临时任务页：不参与收录，避免大量短生命周期 URL 稀释权重 */
export const metadata: Metadata = {
  title: "下载任务",
  description: "VideoGrab 视频下载与 AI 总结任务页",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
