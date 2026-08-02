import { UPDATED_AT } from "@/lib/site";

type Cell = string | boolean;

const rows: { feature: string; videograb: Cell; online: Cell; desktop: Cell }[] =
  [
    { feature: "支持平台数量", videograb: "1000+", online: "10-50", desktop: "100-500" },
    { feature: "AI 视频总结", videograb: true, online: false, desktop: false },
    { feature: "思维导图生成", videograb: true, online: false, desktop: false },
    {
      feature: "字幕下载",
      videograb: "SRT/VTT/TXT",
      online: "部分支持",
      desktop: "部分支持",
    },
    { feature: "最高画质", videograb: "4K", online: "720p-1080p", desktop: "4K" },
    { feature: "无需安装", videograb: true, online: true, desktop: false },
    { feature: "手机浏览器可用", videograb: true, online: "部分支持", desktop: false },
    { feature: "登录免费下载", videograb: "3 次", online: "-", desktop: "-" },
    { feature: "费用", videograb: "免费 AI + 登录 3 次下载，Pro 无限", online: "免费/付费", desktop: "付费为主" },
  ];

function CellValue({ value }: { value: Cell }) {
  if (value === true) {
    return <span className="text-base text-emerald-600">✓</span>;
  }
  if (value === false) {
    return <span className="text-[#94a3b8]">✗</span>;
  }
  return <span>{value}</span>;
}

/** GEO：对比表格，便于 AI 直接引用差异点 */
export default function ComparisonSection() {
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
            VideoGrab 与其他视频下载工具对比
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[#64748b] sm:text-base">
            一句话：VideoGrab 在平台覆盖、AI 总结与免安装体验上更完整。更新于{" "}
            {UPDATED_AT}。
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#e8eef5] bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <table className="w-full min-w-[36rem] text-sm">
            <caption className="sr-only">
              VideoGrab 与其他在线工具、桌面软件的功能对比表
            </caption>
            <thead>
              <tr className="bg-[#f8fafc] text-[#0f172a]">
                <th className="px-5 py-3.5 text-left font-semibold">功能对比</th>
                <th className="px-5 py-3.5 font-semibold text-[#1677ff]">
                  VideoGrab
                </th>
                <th className="px-5 py-3.5 font-semibold">其他在线工具</th>
                <th className="px-5 py-3.5 font-semibold">桌面下载软件</th>
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
