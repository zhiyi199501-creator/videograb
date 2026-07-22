const platforms = [
  {
    name: "YouTube",
    tags: ["#油管", "#4K", "#字幕"],
    gradient: "from-red-500 to-red-700",
    icon: "▶",
  },
  {
    name: "哔哩哔哩",
    tags: ["#B站", "#番剧", "#UP主"],
    gradient: "from-pink-400 to-blue-500",
    icon: "📺",
  },
  {
    name: "抖音 / TikTok",
    tags: ["#短视频", "#无水印", "#热门"],
    gradient: "from-gray-900 to-gray-700",
    icon: "🎵",
  },
  {
    name: "Instagram",
    tags: ["#Reels", "#Stories", "#高清"],
    gradient: "from-purple-500 via-pink-500 to-orange-400",
    icon: "📷",
  },
  {
    name: "Twitter / X",
    tags: ["#推文视频", "#快速", "#支持"],
    gradient: "from-blue-400 to-blue-600",
    icon: "𝕏",
  },
  {
    name: "更多平台",
    tags: ["#1000+", "#持续更新", "#全平台"],
    gradient: "from-[#1677ff] to-[#4096ff]",
    icon: "🌐",
  },
];

export default function PlatformGrid() {
  return (
    <section id="platforms" className="px-4 py-8 sm:px-6">
      <h2 className="mb-6 text-center text-lg font-bold text-[#0f172a]">
        支持平台
      </h2>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {platforms.map((p) => (
          <div
            key={p.name}
            className="overflow-hidden rounded-xl bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-transform hover:-translate-y-0.5"
          >
            <div
              className={`flex h-36 items-center justify-center bg-gradient-to-br ${p.gradient} text-5xl text-white`}
            >
              {p.icon}
            </div>
            <div className="p-4">
              <h3 className="text-sm font-bold text-[#0f172a]">{p.name}</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.tags.map((tag) => (
                  <span key={tag} className="text-xs text-[#94a3b8]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
