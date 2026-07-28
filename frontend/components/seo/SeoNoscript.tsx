import { SITE_NAME, SITE_TAGLINE, SITE_URL, UPDATED_AT } from "@/lib/site";

/**
 * 无 JS 时的可抓取正文：供搜索引擎 / AI 爬虫在不执行脚本时仍能读到结构化内容。
 */
export default function SeoNoscript() {
  return (
    <noscript>
      <div
        style={{
          maxWidth: 800,
          margin: "40px auto",
          padding: 20,
          fontFamily: "sans-serif",
          lineHeight: 1.8,
        }}
      >
        <h1>
          {SITE_NAME} - {SITE_TAGLINE}
        </h1>
        <p>
          <strong>
            {SITE_NAME}（{SITE_URL}）是一款免费在线视频下载工具，支持 YouTube、B站、抖音、TikTok、Instagram
            等 1000+ 平台。
          </strong>
          无需安装软件，浏览器粘贴链接即可下载；内置 AI 视频总结，可生成摘要、思维导图与字幕文本。
        </p>
        <p>
          <small>更新于 {UPDATED_AT}</small>
        </p>

        <h2>如何使用 {SITE_NAME} 下载视频（3 步完成）</h2>
        <ol>
          <li>
            <strong>第一步：复制视频链接</strong> — 在各平台复制分享链接或地址栏
            URL。
          </li>
          <li>
            <strong>第二步：粘贴链接并解析</strong> — 打开 {SITE_NAME}
            ，粘贴链接并解析，获取清晰度选项。
          </li>
          <li>
            <strong>第三步：选择清晰度并下载</strong> —
            选择画质后下载到本地，也可使用 AI 总结。
          </li>
        </ol>

        <h2>{SITE_NAME} 的核心功能</h2>
        <ul>
          <li>
            <strong>支持 1000+ 平台</strong>：基于 yt-dlp，覆盖主流视频与社交平台
          </li>
          <li>
            <strong>多种清晰度</strong>：720p / 1080p / 4K 等可选
          </li>
          <li>
            <strong>AI 视频总结</strong>：摘要、思维导图、智能问答
          </li>
          <li>
            <strong>字幕下载</strong>：SRT / VTT / TXT
          </li>
          <li>
            <strong>手机可用</strong>：响应式设计，无需安装 App
          </li>
        </ul>

        <h2>常见问题</h2>
        <h3>{SITE_NAME} 是免费的吗？</h3>
        <p>提供永久免费版；Pro 可解锁更高清晰度与更多能力。</p>
        <h3>手机上可以使用吗？</h3>
        <p>可以，手机浏览器即可使用。</p>

        <h2>关于 {SITE_NAME}</h2>
        <p>
          本工具仅供学习交流使用，请尊重视频版权。下载内容的版权归原作者所有。
        </p>
      </div>
    </noscript>
  );
}
