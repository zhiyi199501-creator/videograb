import Link from "next/link";

const features = [
  {
    title: "AI 视频总结",
    desc: "一键生成视频内容摘要，快速掌握核心要点",
    tags: ["#AI", "#效率", "#学习"],
    price: "¥29",
    original: "¥99",
    badge: "即将上线",
    featured: false,
    gradient: "from-emerald-400 to-teal-600",
    icon: "🤖",
  },
  {
    title: "字幕翻译",
    desc: "自动提取字幕并翻译为多语言，突破语言障碍",
    tags: ["#字幕", "#翻译", "#多语言"],
    price: "¥19",
    original: "¥59",
    badge: "即将上线",
    featured: false,
    gradient: "from-violet-400 to-purple-600",
    icon: "🌍",
  },
  {
    title: "Pro 全能套餐",
    desc: "批量下载 · 4K 无损 · 无限制 · AI 总结 · 字幕翻译",
    tags: ["#批量", "#4K", "#无限制"],
    price: "¥29",
    original: "¥99",
    badge: "限时优惠",
    featured: true,
    gradient: "from-[#1677ff] to-[#0050d4]",
    icon: "⚡",
  },
];

export default function ProFeatureCards() {
  return (
    <section className="px-4 py-8 sm:px-6">
      <div className="mb-6 text-center">
        <h2 className="text-lg font-bold text-[#0f172a]">Pro 高级功能</h2>
        <p className="mt-1 text-sm text-[#64748b]">解锁更多能力，提升下载体验</p>
      </div>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className={`relative overflow-hidden rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-transform hover:-translate-y-0.5 ${
              f.featured
                ? "bg-gradient-to-br from-[#1e3a5f] via-[#2d1b69] to-[#1a1a2e] text-white sm:col-span-2 lg:col-span-1"
                : "bg-white"
            }`}
          >
            <span
              className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                f.featured
                  ? "bg-orange-500 text-white"
                  : "bg-[#1677ff]/10 text-[#1677ff]"
              }`}
            >
              {f.badge}
            </span>

            <div
              className={`flex h-28 items-center justify-center bg-gradient-to-br ${f.gradient} text-4xl ${
                f.featured ? "opacity-80" : ""
              }`}
            >
              {f.icon}
            </div>

            <div className="p-4">
              <h3
                className={`text-sm font-bold ${
                  f.featured ? "text-white" : "text-[#0f172a]"
                }`}
              >
                {f.title}
              </h3>
              <p
                className={`mt-1 text-xs leading-relaxed ${
                  f.featured ? "text-white/70" : "text-[#64748b]"
                }`}
              >
                {f.desc}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {f.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`text-xs ${
                      f.featured ? "text-white/50" : "text-[#94a3b8]"
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span
                  className={`text-lg font-bold ${
                    f.featured ? "text-orange-400" : "text-[#1677ff]"
                  }`}
                >
                  {f.price}/月
                </span>
                <span
                  className={`text-xs line-through ${
                    f.featured ? "text-white/40" : "text-[#94a3b8]"
                  }`}
                >
                  原价 {f.original}/月
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#1677ff] hover:underline"
        >
          查看完整定价方案 →
        </Link>
      </div>
    </section>
  );
}
