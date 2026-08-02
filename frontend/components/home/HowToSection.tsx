"use client";

import { useTranslations } from "next-intl";

/** GEO：步骤式结构化内容，便于 AI / 搜索引擎抽取 */
export default function HowToSection() {
  const t = useTranslations("home");
  const tSeo = useTranslations("seo");

  const steps = [
    {
      number: 1,
      title: t("howtoStep1Title"),
      desc: t("howtoStep1Desc"),
    },
    {
      number: 2,
      title: t("howtoStep2Title"),
      desc: t("howtoStep2Desc"),
    },
    {
      number: 3,
      title: t("howtoStep3Title"),
      desc: t("howtoStep3Desc"),
    },
  ];

  return (
    <section
      id="how-to-use"
      className="border-t border-[#e8eef5]/80 bg-white/60 py-14 sm:py-16"
      aria-labelledby="howto-heading"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <h2
            id="howto-heading"
            className="text-2xl font-bold text-[#0f172a] sm:text-3xl"
          >
            {t("howtoTitle", { site: "VideoGrab" }).split("VideoGrab").map((part, i, arr) =>
              i < arr.length - 1 ? (
                <span key={i}>
                  {part}
                  <span className="text-[#1677ff]">VideoGrab</span>
                </span>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[#64748b] sm:text-base">
            {t("howtoLead")}
          </p>
        </div>

        <ol className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {steps.map((step) => (
            <li key={step.number} className="relative text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1677ff]/10 text-xl font-bold text-[#1677ff]">
                {step.number}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-[#0f172a]">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-[#64748b]">
                {step.desc}
              </p>
            </li>
          ))}
        </ol>

        <p className="mt-8 text-center text-xs text-[#94a3b8]">
          {t("howtoFooter", { updatedAt: tSeo("updatedAt") })}
        </p>
      </div>
    </section>
  );
}
