import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  PRICING_DESCRIPTION,
  PRICING_KEYWORDS,
  PRICING_TITLE,
  SITE_URL,
} from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: PRICING_TITLE },
  description: PRICING_DESCRIPTION,
  keywords: PRICING_KEYWORDS,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: PRICING_TITLE,
    description: PRICING_DESCRIPTION,
    url: `${SITE_URL}/pricing`,
    type: "website",
  },
};

const plans = [
  {
    name: "Free",
    price: "¥0",
    period: "永久免费",
    desc: "适合偶尔下载",
    features: [
      "每日 10 次解析",
      "最高 720p 画质",
      "单视频下载",
      "1000+ 平台支持",
    ],
    cta: "当前方案",
    highlighted: false,
    available: true,
  },
  {
    name: "Pro",
    price: "¥29",
    period: "/月",
    original: "¥99/月",
    desc: "适合重度用户",
    features: [
      "无限次解析",
      "4K 无损画质",
      "批量下载",
      "AI 视频总结",
      "字幕翻译",
      "优先下载队列",
    ],
    cta: "即将上线",
    highlighted: true,
    available: false,
  },
  {
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
      "自定义水印去除",
    ],
    cta: "即将上线",
    highlighted: false,
    available: false,
  },
];

export default function PricingPage() {
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
            从免费版开始，随时升级解锁更多能力
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan) => (
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
                disabled={!plan.available}
                className={`mt-6 w-full rounded-full py-2.5 text-sm font-medium transition-colors ${
                  plan.highlighted
                    ? "bg-[#1677ff] text-white hover:bg-[#4096ff] disabled:opacity-60"
                    : "border border-[#f0f1f2] text-[#020817] hover:border-[#1677ff] disabled:opacity-60"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-2xl text-center">
          <Link
            href="/"
            className="text-sm text-[#1677ff] hover:underline"
          >
            ← 返回首页，免费开始下载
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
