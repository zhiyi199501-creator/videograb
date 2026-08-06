"use client";

import { useTranslations } from "next-intl";
import { useAiSummaryApp } from "@/lib/useAiSummaryApp";

interface HeroSectionProps {
  /** 紧凑首屏：缩小间距；演示模式关闭时弱化副文案 */
  compact?: boolean;
}

export default function HeroSection({ compact = false }: HeroSectionProps) {
  const t = useTranslations("home");
  const aiFirst = useAiSummaryApp();

  const titleBefore = aiFirst ? t("aiHeroTitleBefore") : t("heroTitleBefore");
  const titleAccent = aiFirst ? t("aiHeroTitleAccent") : t("heroTitleAccent");
  const subtitle = aiFirst ? t("aiHeroSubtitle") : t("heroSubtitle");

  return (
    <section
      className={`relative px-4 text-center sm:px-6 ${
        compact ? "pb-3 pt-2" : "pb-4 pt-4"
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-36 max-w-2xl rounded-full bg-[radial-gradient(ellipse_at_center,rgba(22,119,255,0.12),transparent_70%)] blur-2xl"
      />
      <p className="relative mb-2 text-xs font-semibold tracking-[0.18em] text-[#1677ff]/80 uppercase">
        {aiFirst ? "VideoGrab AI" : "VideoGrab"}
      </p>
      <h1
        className={`relative font-extrabold leading-[1.15] tracking-tight text-[#0f172a] ${
          compact
            ? "text-[1.65rem] sm:text-3xl"
            : "text-[2rem] sm:text-4xl lg:text-[2.75rem]"
        }`}
      >
        {titleBefore}
        <span className="text-[#1677ff]">{titleAccent}</span>
      </h1>
      {(!compact || aiFirst) && (
        <p className="relative mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#64748b] sm:text-[15px]">
          {subtitle}
          {!aiFirst && (
            <>
              <br className="hidden sm:block" />
              {t("heroSubtitleAi")}
            </>
          )}
        </p>
      )}
    </section>
  );
}
