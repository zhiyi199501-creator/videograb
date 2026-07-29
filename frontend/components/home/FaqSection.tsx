import { UPDATED_AT } from "@/lib/site";

const faqs = [
  {
    q: "VideoGrab 支持哪些视频平台？",
    a: "基于 yt-dlp，支持 YouTube、B站、抖音、TikTok、Instagram、Twitter/X 等 1000+ 主流视频与社交媒体平台。",
  },
  {
    q: "VideoGrab 是免费的吗？",
    a: "提供永久免费版可日常下载。登录后 AI 总结免费 3 次；升级 Pro（¥9.9/月）可无限使用 AI 总结。",
  },
  {
    q: "如何下载 YouTube / B站 / 抖音视频？",
    a: "复制链接 → 粘贴到首页输入框并解析 → 选择清晰度下载。三步完成，无需注册安装。",
  },
  {
    q: "AI 视频总结能做什么？",
    a: "自动提取字幕或语音转写，生成结构化摘要与思维导图，并支持基于字幕的智能问答，适合快速消化长视频。",
  },
  {
    q: "和其他下载工具有什么区别？",
    a: "平台覆盖更广（1000+）、内置 AI 总结与导图、浏览器即用、字幕多格式导出、手机端可用。",
  },
  {
    q: "手机上能用吗？",
    a: "可以。响应式适配手机浏览器；微信内打开时会提示跳转系统浏览器完成下载。",
  },
];

/** GEO：问答式内容，便于生成式引擎直接引用 */
export default function FaqSection() {
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
            常见问题（FAQ）
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[#64748b] sm:text-base">
            关于 VideoGrab 平台支持、免费额度、下载步骤与 AI
            总结的快速解答。更新于 {UPDATED_AT}。
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
