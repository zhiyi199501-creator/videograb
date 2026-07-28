import {
  HOME_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";

const webAppLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: HOME_DESCRIPTION,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "CNY",
  },
  featureList: [
    "支持1000+视频平台下载",
    "多种清晰度选择（720p至4K）",
    "AI视频内容总结",
    "思维导图自动生成",
    "字幕下载（SRT/VTT/TXT）",
    "移动端适配",
    "无需安装软件",
  ],
  author: {
    "@type": "Organization",
    name: SITE_NAME,
  },
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "VideoGrab 支持哪些视频平台？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "VideoGrab 基于 yt-dlp，支持 YouTube、B站、抖音、TikTok、Instagram、Twitter/X 等 1000+ 全球主流视频与社交媒体平台。",
      },
    },
    {
      "@type": "Question",
      name: "VideoGrab 是免费的吗？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "VideoGrab 提供永久免费版，支持每日解析与最高 720p 画质。Pro 套餐可解锁更高清晰度、批量下载、AI 视频总结等能力。",
      },
    },
    {
      "@type": "Question",
      name: "如何使用 VideoGrab 下载视频？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "只需 3 步：1. 复制视频链接；2. 粘贴到 VideoGrab 输入框并解析；3. 选择清晰度后下载。无需安装软件，手机浏览器也可使用。",
      },
    },
    {
      "@type": "Question",
      name: "VideoGrab 的 AI 视频总结功能是什么？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "解析视频后可自动触发 AI 总结：提取字幕或语音转写，生成结构化摘要、思维导图，并支持基于字幕的智能问答，帮助快速理解长视频。",
      },
    },
    {
      "@type": "Question",
      name: "VideoGrab 和其他视频下载工具有什么区别？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "核心差异：支持 1000+ 平台；内置 AI 总结与思维导图；在线即用无需安装；支持字幕多格式下载；手机浏览器可用。",
      },
    },
    {
      "@type": "Question",
      name: "手机上可以使用 VideoGrab 吗？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "可以。VideoGrab 采用响应式设计，适配手机浏览器。微信内置浏览器会提示用系统浏览器打开以完成下载。",
      },
    },
  ],
};

const howToLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "如何使用 VideoGrab 下载视频",
  description:
    "使用 VideoGrab 在线视频下载器，只需 3 步即可免费下载 YouTube、B站、抖音等 1000+ 平台的视频。",
  totalTime: "PT1M",
  tool: {
    "@type": "HowToTool",
    name: "VideoGrab 在线视频下载器",
  },
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "复制视频链接",
      text: "在 YouTube、B站、抖音等平台找到想下载的视频，复制分享链接或地址栏 URL。",
      url: `${SITE_URL}/#how-to-use`,
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "粘贴链接并解析",
      text: "打开 VideoGrab，将链接粘贴到输入框并解析。系统会识别平台并返回标题、缩略图与可用清晰度。",
      url: `${SITE_URL}/#how-to-use`,
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "选择清晰度并下载",
      text: "选择清晰度后点击下载保存到本地。解析成功后还可自动生成 AI 摘要与思维导图。",
      url: `${SITE_URL}/#how-to-use`,
    },
  ],
};

export default function JsonLd() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
      />
    </>
  );
}
