"use client";

import { useTranslations } from "next-intl";

/** GEO：问答式内容，便于生成式引擎直接引用 */
export default function FaqSection() {
  const t = useTranslations("home");
  const tSeo = useTranslations("seo");

  const faqs = [
    { q: t("faq1q"), a: t("faq1a") },
    { q: t("faq2q"), a: t("faq2a") },
    { q: t("faq3q"), a: t("faq3a") },
    { q: t("faq4q"), a: t("faq4a") },
    { q: t("faq5q"), a: t("faq5a") },
    { q: t("faq6q"), a: t("faq6a") },
  ];

  return (
    <section
      id="faq"
      className="border-t border-[#e8eef5]/80 bg-white/60 py-14 sm:py-16"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <h2
            id="faq-heading"
            className="text-2xl font-bold text-[#0f172a] sm:text-3xl"
          >
            {t("faqTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[#64748b] sm:text-base">
            {t("faqLead", { updatedAt: tSeo("updatedAt") })}
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((item) => (
            <article
              key={item.q}
              className="rounded-xl border border-[#e8eef5] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <h3 className="text-base font-semibold text-[#0f172a]">{item.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
                {item.a}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
