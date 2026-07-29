"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { extractUrl, normalizeVideoUrl } from "@/lib/api";

interface UrlInputBarProps {
  compact?: boolean;
}

export default function UrlInputBar({ compact = false }: UrlInputBarProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = normalizeVideoUrl(url);
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
    <section className={`px-4 sm:px-6 ${compact ? "pb-2" : "pb-4"}`}>
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-xl">
        <div className="flex flex-col gap-2 rounded-full border border-white/80 bg-white/95 p-1.5 shadow-[0_8px_30px_-12px_rgba(22,119,255,0.22)] ring-1 ring-[#1677ff]/10 backdrop-blur-sm sm:flex-row sm:items-center sm:gap-0">
          <input
            type="text"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="粘贴视频链接，例如 bilibili.com/video/BV..."
            className="flex-1 rounded-full bg-transparent px-5 py-3 text-sm text-[#020817] placeholder:text-[#94a3b8] outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 rounded-full bg-[#1677ff] px-6 py-2.5 text-sm font-medium text-white shadow-[0_4px_14px_-4px_rgba(22,119,255,0.5)] transition-all hover:bg-[#4096ff] disabled:opacity-60"
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
