import Link from "next/link";

const features = [
  {
    title: "AI 视频总结",
    desc: "摘要 · 导图 · 问答",
    price: "¥9.9",
    badge: "已上线",
    featured: false,
    icon: "✨",
  },
  {
    title: "字幕翻译",
    desc: "多语言字幕",
    price: "¥19",
    badge: "即将上线",
    featured: false,
    icon: "🌐",
  },
  {
    title: "Pro 全能套餐",
    desc: "批量 · 4K · 无限次",
    price: "¥9.9",
    badge: "限时",
    featured: true,
    icon: "⚡",
  },
];

interface ProFeatureCardsProps {
  compact?: boolean;
}

export default function ProFeatureCards({
  compact = false,
}: ProFeatureCardsProps) {
  return (
    <section className={`px-4 sm:px-6 ${compact ? "py-3" : "py-6"}`}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-bold text-[#0f172a]">Pro 高级功能</h2>
          <Link
            href="/pricing"
            className="text-xs font-medium text-[#1677ff] hover:underline"
          >
            查看定价 →
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#e8eef5] bg-white/90 shadow-[0_4px_20px_-10px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`flex items-center gap-3 px-3.5 py-2.5 ${
                i > 0 ? "border-t border-[#f1f5f9]" : ""
              } ${f.featured ? "bg-[#1677ff]/[0.04]" : ""}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${
                  f.featured
                    ? "bg-[#1677ff] text-white"
                    : "bg-[#f1f5f9] text-[#334155]"
                }`}
              >
                {f.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold text-[#0f172a]">
                    {f.title}
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      f.featured
                        ? "bg-[#1677ff]/10 text-[#1677ff]"
                        : "bg-[#f1f5f9] text-[#64748b]"
                    }`}
                  >
                    {f.badge}
                  </span>
                </div>
                <p className="truncate text-xs text-[#94a3b8]">{f.desc}</p>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-sm font-bold text-[#1677ff]">
                  {f.price}
                </span>
                <span className="text-[10px] text-[#94a3b8]">/月</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
