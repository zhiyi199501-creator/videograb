"use client";

import { useTranslations } from "next-intl";

interface PlatformGridProps {
  compact?: boolean;
}

export default function PlatformGrid({ compact = false }: PlatformGridProps) {
  const t = useTranslations("home");

  const platforms = [
    {
      name: "YouTube",
      color: "#ff4d4f",
      href: "https://www.youtube.com",
    },
    {
      name: t("platformBilibili"),
      color: "#fb7299",
      href: "https://www.bilibili.com",
    },
    {
      name: t("platformDouyin"),
      color: "#111827",
      href: "https://www.douyin.com",
    },
    {
      name: "TikTok",
      color: "#0f172a",
      href: "https://www.tiktok.com",
    },
    {
      name: "Instagram",
      color: "#e1306c",
      href: "https://www.instagram.com",
    },
    {
      name: "Twitter / X",
      color: "#1d9bf0",
      href: "https://x.com",
    },
    {
      name: t("platformMore"),
      color: "#1677ff",
      href: "https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md",
    },
  ];

  return (
    <section
      id="platforms"
      className={`px-4 sm:px-6 ${compact ? "pb-3 pt-8 sm:pt-10" : "pb-6 pt-10"}`}
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium tracking-wide text-[#94a3b8]">
          {t("platformsLabel")}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {platforms.map((p) => (
            <a
              key={p.name}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e8eef5] bg-white/80 px-3 py-1.5 text-xs font-medium text-[#334155] shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-sm transition-colors hover:border-[#cfe0ff] hover:text-[#1677ff]"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: p.color }}
                aria-hidden
              />
              {p.name}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
