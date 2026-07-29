"use client";

import Link from "next/link";
import { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/lib/auth";

export default function PricingSuccessPage() {
  const { refreshMe, user, loading } = useAuth();

  useEffect(() => {
    const t = setTimeout(() => {
      refreshMe().catch(() => undefined);
    }, 800);
    return () => clearTimeout(t);
  }, [refreshMe]);

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-2xl font-black text-[#0f172a]">支付成功</h1>
        <p className="mt-3 max-w-md text-sm text-[#64748b]">
          {loading
            ? "正在确认会员状态…"
            : user?.is_pro
              ? "你的 Pro 会员已开通，可以开始使用 AI 视频总结。"
              : "若会员尚未生效，请稍等几秒后刷新（Webhook 可能略有延迟）。"}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => refreshMe()}
            className="rounded-full border border-[#e2e8f0] px-5 py-2 text-sm hover:border-[#1677ff]"
          >
            刷新状态
          </button>
          <Link
            href="/"
            className="rounded-full bg-[#1677ff] px-5 py-2 text-sm font-medium text-white hover:bg-[#4096ff]"
          >
            开始使用
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
