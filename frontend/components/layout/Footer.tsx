"use client";

import { useTranslations } from "next-intl";
import { useAiSummaryApp } from "@/lib/useAiSummaryApp";

export default function Footer() {
  const t = useTranslations("footer");
  const aiFirst = useAiSummaryApp();

  // iOS AI 精简壳：去掉页尾，首页尽量一屏、少滚动
  if (aiFirst) return null;

  return (
    <footer className="mt-auto border-t border-[#e8eef5]/80 bg-white/70 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1677ff] text-xs font-bold text-white">
                V
              </div>
              <span className="font-bold text-[#0f172a]">VideoGrab</span>
            </div>
            <p className="text-sm leading-relaxed text-[#64748b]">
              {t("tagline")}
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold text-[#0f172a]">
              {t("disclaimerTitle")}
            </h4>
            <p className="text-xs leading-relaxed text-[#94a3b8]">
              {t("disclaimer")}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center justify-between gap-2 border-t border-[#f0f1f2] pt-4 text-xs text-[#94a3b8] sm:flex-row">
          <span>{t("copyright")}</span>
          <span>{t("icp")}</span>
        </div>
      </div>
    </footer>
  );
}
