import { UPDATED_AT } from "@/lib/site";

const steps = [
  {
    number: 1,
    title: "复制视频链接",
    desc: "在 YouTube、B站、抖音等平台找到想下载的视频，复制分享链接或地址栏 URL。",
  },
  {
    number: 2,
    title: "粘贴链接并解析",
    desc: "打开 VideoGrab，将链接粘贴到输入框并解析。系统自动识别平台，返回标题、缩略图与可用清晰度。",
  },
  {
    number: 3,
    title: "选择清晰度并下载",
    desc: "登录后选择清晰度并下载（免费 3 次）。解析成功后还可自动生成 AI 摘要与思维导图，AI 总结无需登录。",
  },
];

/** GEO：步骤式结构化内容，便于 AI / 搜索引擎抽取 */
export default function HowToSection() {
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
            如何使用 <span className="text-[#1677ff]">VideoGrab</span> 下载视频
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[#64748b] sm:text-base">
            结论先行：只需 3 步，登录后即可免费下载 3 次 YouTube、B站、抖音等
            1000+ 平台视频，无需安装软件。
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
          全程可直接使用；手机浏览器同样支持。更新于 {UPDATED_AT}。
        </p>
      </div>
    </section>
  );
}
