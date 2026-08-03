"use client";

import { useTranslations } from "next-intl";

type Cell = string | boolean;

/** GEO：对比表格，便于 AI 直接引用差异点 */
export default function ComparisonSection() {
  const t = useTranslations("home");
  const tSeo = useTranslations("seo");

  const rows: { feature: string; videograb: Cell; online: Cell; desktop: Cell }[] =
    [
      { feature: t("rowPlatforms"), videograb: "1000+", online: "10-50", desktop: "100-500" },
      { feature: t("rowAiSummary"), videograb: true, online: false, desktop: false },
      { feature: t("rowMindmap"), videograb: true, online: false, desktop: false },
      {
        feature: t("rowSubtitles"),
        videograb: "SRT/VTT/TXT",
        online: t("cellPartial"),
        desktop: t("cellPartial"),
      },
      { feature: t("rowMaxQuality"), videograb: "4K", online: "720p-1080p", desktop: "4K" },
      { feature: t("rowNoInstall"), videograb: true, online: true, desktop: false },
      { feature: t("rowMobile"), videograb: true, online: t("cellPartial"), desktop: false },
      { feature: t("rowFreeDownloads"), videograb: t("cellFree3"), online: "-", desktop: "-" },
      {
        feature: t("rowCost"),
        videograb: t("cellCostVg"),
        online: t("cellCostOnline"),
        desktop: t("cellCostDesktop"),
      },
    ];

  return (
    <section
      id="comparison"
      className="border-t border-[#e8eef5]/80 py-14 sm:py-16"
      aria-labelledby="comparison-heading"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <h2
            id="comparison-heading"
            className="text-2xl font-bold text-[#0f172a] sm:text-3xl"
          >
            {t("comparisonTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[#64748b] sm:text-base">
            {t("comparisonLead", { updatedAt: tSeo("updatedAt") })}
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#e8eef5] bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <table className="w-full min-w-[36rem] text-sm">
            <caption className="sr-only">{t("comparisonCaption")}</caption>
            <thead>
              <tr className="bg-[#f8fafc] text-[#0f172a]">
                <th className="px-5 py-3.5 text-left font-semibold">
                  {t("comparisonColFeature")}
                </th>
                <th className="px-5 py-3.5 font-semibold text-[#1677ff]">
                  VideoGrab
                </th>
                <th className="px-5 py-3.5 font-semibold">
                  {t("comparisonColOnline")}
                </th>
                <th className="px-5 py-3.5 font-semibold">
                  {t("comparisonColDesktop")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.feature}
                  className={i % 2 === 1 ? "bg-[#f8fafc]/60" : "bg-white"}
                >
                  <td className="px-5 py-3 font-medium text-[#0f172a]">
                    {row.feature}
                  </td>
                  <td className="px-5 py-3 text-center text-[#020817]">
                    <CellValue value={row.videograb} />
                  </td>
                  <td className="px-5 py-3 text-center text-[#64748b]">
                    <CellValue value={row.online} />
                  </td>
                  <td className="px-5 py-3 text-center text-[#64748b]">
                    <CellValue value={row.desktop} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function CellValue({ value }: { value: Cell }) {
  if (value === true) {
    return <span className="text-base text-emerald-600">✓</span>;
  }
  if (value === false) {
    return <span className="text-[#94a3b8]">✗</span>;
  }
  return <span>{value}</span>;
}
