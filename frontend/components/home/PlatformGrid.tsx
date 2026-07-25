const platforms = [
  { name: "YouTube", color: "#ff4d4f" },
  { name: "哔哩哔哩", color: "#fb7299" },
  { name: "抖音", color: "#111827" },
  { name: "TikTok", color: "#0f172a" },
  { name: "Instagram", color: "#e1306c" },
  { name: "Twitter / X", color: "#1d9bf0" },
  { name: "1000+ 更多", color: "#1677ff" },
];

interface PlatformGridProps {
  compact?: boolean;
}

export default function PlatformGrid({ compact = false }: PlatformGridProps) {
  return (
    <section
      id="platforms"
      className={`px-4 sm:px-6 ${compact ? "pb-3 pt-1" : "pb-6 pt-2"}`}
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium tracking-wide text-[#94a3b8]">
          支持平台
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {platforms.map((p) => (
            <span
              key={p.name}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e8eef5] bg-white/80 px-3 py-1.5 text-xs font-medium text-[#334155] shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-sm transition-colors hover:border-[#cfe0ff] hover:text-[#1677ff]"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: p.color }}
                aria-hidden
              />
              {p.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
