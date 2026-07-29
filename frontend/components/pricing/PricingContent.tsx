"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  createCheckoutSession,
  createPortalSession,
  useAuth,
} from "@/lib/auth";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "¥0",
    period: "永久免费",
    desc: "适合偶尔下载",
    features: [
      "每日解析（受限流）",
      "视频下载",
      "1000+ 平台支持",
      "登录后 AI 总结免费 3 次",
    ],
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "¥9.9",
    period: "/月",
    original: "¥29/月",
    desc: "适合重度用户",
    features: [
      "无限次 AI 视频总结 / 导图 / 问答",
      "字幕提取与下载",
      "优先体验新功能",
      "可随时在账单门户取消",
    ],
    highlighted: true,
  },
] as const;

export default function PricingContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState("");

  const onUpgrade = async () => {
    setError("");
    if (!user) {
      router.push("/login?next=/pricing");
      return;
    }
    if (user.is_pro) return;
    setBusy("checkout");
    try {
      const url = await createCheckoutSession();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "发起支付失败");
      setBusy(null);
    }
  };

  const onManage = async () => {
    setError("");
    setBusy("portal");
    try {
      const url = await createPortalSession();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "打开账单门户失败");
      setBusy(null);
    }
  };

  return (
    <>
      <Navbar />
      <main className="relative flex-1 overflow-hidden px-4 py-12 sm:px-6 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(22,119,255,0.08),_transparent_55%)]"
        />
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-black tracking-tight text-[#0f172a] sm:text-4xl">
            选择适合你的
            <span className="text-[#1677ff]">下载方案</span>
          </h1>
          <p className="mt-3 text-sm text-[#64748b] sm:text-base">
            免费下载随时用；登录可试用 AI 总结，升级 Pro 不限次数
          </p>
          {!loading && user?.is_pro && (
            <p className="mt-3 inline-flex rounded-full bg-[#1677ff]/10 px-3 py-1 text-sm font-medium text-[#1677ff]">
              当前账号已是 Pro 会员
            </p>
          )}
        </div>

        {error && (
          <p className="mx-auto mt-6 max-w-lg text-center text-sm text-red-500">
            {error}
          </p>
        )}

        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-6 sm:mt-12 md:grid-cols-2 md:items-stretch">
          {plans.map((plan) => {
            const isProCard = plan.id === "pro";
            let cta = "当前方案";
            let disabled = true;
            let onClick: (() => void) | undefined;

            if (plan.id === "free") {
              cta = user?.is_pro ? "返回下载" : user ? "当前方案" : "免费开始";
              disabled = !!user && !user.is_pro;
              onClick = () => router.push("/");
            } else if (isProCard) {
              if (user?.is_pro) {
                cta = busy === "portal" ? "打开中…" : "管理订阅";
                disabled = busy !== null;
                onClick = onManage;
              } else {
                cta = busy === "checkout" ? "跳转支付…" : "升级 Pro";
                disabled = busy !== null || loading;
                onClick = onUpgrade;
              }
            }

            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl p-6 sm:p-7 ${
                  plan.highlighted
                    ? "border-2 border-[#1677ff] bg-gradient-to-b from-[#1677ff]/[0.06] to-white shadow-[0_12px_40px_-12px_rgba(22,119,255,0.35)]"
                    : "border border-[#e8eef5] bg-white/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#1677ff] px-3 py-0.5 text-xs font-medium text-white">
                    最受欢迎
                  </span>
                )}
                <h3 className="text-lg font-bold text-[#0f172a]">{plan.name}</h3>
                <p className="mt-1 text-xs text-[#64748b]">{plan.desc}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tight text-[#0f172a]">
                    {plan.price}
                  </span>
                  <span className="text-sm text-[#64748b]">{plan.period}</span>
                </div>
                {"original" in plan && plan.original && (
                  <p className="mt-1 text-xs text-[#94a3b8] line-through">
                    原价 {plan.original}
                  </p>
                )}
                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm leading-snug text-[#020817]"
                    >
                      <span className="mt-0.5 text-[#1677ff]">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={onClick}
                  className={`mt-8 w-full rounded-full py-2.5 text-sm font-medium transition-colors ${
                    plan.highlighted
                      ? "bg-[#1677ff] text-white hover:bg-[#4096ff] disabled:opacity-60"
                      : "border border-[#e2e8f0] text-[#020817] hover:border-[#1677ff] disabled:opacity-60"
                  }`}
                >
                  {cta}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-10 max-w-2xl text-center">
          <Link href="/" className="text-sm text-[#1677ff] hover:underline">
            ← 返回首页，免费开始下载
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
