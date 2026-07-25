"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { extractUrl } from "@/lib/api";

export default function UrlInputBar() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setError("请输入视频链接");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const job = await extractUrl(trimmed);
      router.push(`/download/${job.job_id}?url=${encodeURIComponent(trimmed)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析失败，请检查链接");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="px-4 pb-6 sm:px-6">
      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
        <div className="flex flex-col gap-2 rounded-2xl border border-white/80 bg-white/90 p-1.5 shadow-[0_8px_30px_-12px_rgba(22,119,255,0.25)] ring-1 ring-[#1677ff]/8 backdrop-blur-sm sm:flex-row sm:items-center sm:gap-0 sm:p-1.5">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="粘贴视频链接，例如 https://www.bilibili.com/video/..."
            className="flex-1 rounded-xl bg-transparent px-4 py-3 text-sm text-[#020817] placeholder:text-[#94a3b8] outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 rounded-full bg-[#1677ff] px-7 py-2.5 text-sm font-medium text-white shadow-[0_4px_14px_-4px_rgba(22,119,255,0.55)] transition-all hover:bg-[#4096ff] hover:shadow-[0_6px_18px_-4px_rgba(22,119,255,0.5)] disabled:opacity-60"
          >
            {loading ? "解析中..." : "开始解析"}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-center text-sm text-red-500">{error}</p>
        )}
      </form>
    </section>
  );
}
