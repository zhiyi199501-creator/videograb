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
  {
    id: "team",
    name: "Team",
    price: "¥99",
    period: "/月",
    original: "¥299/月",
    desc: "适合团队/工作室",
    features: [
      "Pro 全部功能",
      "5 个子账号",
      "API 接口访问",
      "专属客服支持",
    ],
    highlighted: false,
  },
];

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
      <main className="flex-1 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-black text-[#0f172a] sm:text-4xl">
            选择适合你的
            <span className="text-[#1677ff]">下载方案</span>
          </h1>
          <p className="mt-3 text-sm text-[#64748b]">
            从免费版开始，升级 Pro 解锁 AI 视频总结
          </p>
          {!loading && user?.is_pro && (
            <p className="mt-2 text-sm font-medium text-[#1677ff]">
              当前账号已是 Pro 会员
            </p>
          )}
        </div>

        {error && (
          <p className="mx-auto mt-6 max-w-lg text-center text-sm text-red-500">
            {error}
          </p>
        )}

        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const isProCard = plan.id === "pro";
            const isTeam = plan.id === "team";
            let cta = "当前方案";
            let disabled = true;
            let onClick: (() => void) | undefined;

            if (plan.id === "free") {
              cta = user ? "当前方案" : "免费开始";
              disabled = !!user;
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
            } else if (isTeam) {
              cta = "即将上线";
              disabled = true;
            }

            return (
              <div
                key={plan.name}
                className={`relative rounded-xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] ${
                  plan.highlighted
                    ? "border-2 border-[#1677ff] bg-gradient-to-b from-[#1677ff]/5 to-white"
                    : "border border-[#f0f1f2] bg-white"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#1677ff] px-3 py-0.5 text-xs font-medium text-white">
                    最受欢迎
                  </span>
                )}
                <h3 className="text-lg font-bold text-[#0f172a]">{plan.name}</h3>
                <p className="mt-1 text-xs text-[#64748b]">{plan.desc}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[#0f172a]">
                    {plan.price}
                  </span>
                  <span className="text-sm text-[#64748b]">{plan.period}</span>
                </div>
                {plan.original && (
                  <p className="mt-1 text-xs text-[#94a3b8] line-through">
                    原价 {plan.original}
                  </p>
                )}
                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-[#020817]"
                    >
                      <span className="text-[#1677ff]">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={onClick}
                  className={`mt-6 w-full rounded-full py-2.5 text-sm font-medium transition-colors ${
                    plan.highlighted
                      ? "bg-[#1677ff] text-white hover:bg-[#4096ff] disabled:opacity-60"
                      : "border border-[#f0f1f2] text-[#020817] hover:border-[#1677ff] disabled:opacity-60"
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
