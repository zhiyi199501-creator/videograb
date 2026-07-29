import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-[#e8eef5]/80 bg-white/70 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1677ff] text-xs font-bold text-white">
                V
              </div>
              <span className="font-bold text-[#0f172a]">VideoGrab</span>
            </div>
            <p className="text-sm leading-relaxed text-[#64748b]">
              万能视频下载工具，支持 1000+ 平台，随时随地保存视频到本地。
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold text-[#0f172a]">产品</h4>
            <ul className="space-y-2 text-sm text-[#64748b]">
              <li>
                <Link href="/" className="hover:text-[#1677ff]" title="免费在线视频下载">
                  视频下载
                </Link>
              </li>
              <li>
                <Link href="/#how-to-use" className="hover:text-[#1677ff]" title="如何使用 VideoGrab 下载视频">
                  使用说明
                </Link>
              </li>
              <li>
                <Link href="/#comparison" className="hover:text-[#1677ff]" title="VideoGrab 与其他下载工具对比">
                  工具对比
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-[#1677ff]" title="VideoGrab 常见问题">
                  常见问题
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-[#1677ff]" title="VideoGrab 定价方案">
                  定价方案
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold text-[#0f172a]">免责声明</h4>
            <p className="text-xs leading-relaxed text-[#94a3b8]">
              本工具仅供个人学习与研究使用。用户应确保对所下载内容拥有合法权利，并遵守各平台服务条款。
              请勿用于侵犯版权或商业用途，由此产生的法律责任由用户自行承担。
              本服务不永久存储任何视频内容，文件将在 2 小时后自动删除。
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center justify-between gap-2 border-t border-[#f0f1f2] pt-4 text-xs text-[#94a3b8] sm:flex-row">
          <span>© 2026 VideoGrab. 基于 yt-dlp 开源项目构建。</span>
          <span>沪ICP备XXXXXXXX号（占位）</span>
        </div>
      </div>
    </footer>
  );
}
