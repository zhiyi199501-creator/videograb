"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SubtitleSegment, subscribeSummarize } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  SubtitleFormat,
  downloadSubtitles,
} from "@/lib/subtitleFormat";
import ChatBox from "./ChatBox";
import MarkdownContent from "./MarkdownContent";
import MindMapView from "./MindMapView";

type Tab = "summary" | "subtitle" | "mindmap" | "chat";

interface SummaryPanelProps {
  jobId: string;
  title?: string | null;
  /** 挂载后自动开始总结（仅 Pro 生效） */
  autoStart?: boolean;
  className?: string;
}

export default function SummaryPanel({
  jobId,
  title,
  autoStart = false,
  className = "",
}: SummaryPanelProps) {
  const { user, loading: authLoading, refreshMe } = useAuth();
  const isPro = !!user?.is_pro;
  const canUseAi =
    !!user &&
    (typeof user.can_use_ai === "boolean"
      ? user.can_use_ai
      : isPro ||
        (typeof user.ai_free_remaining === "number" &&
          user.ai_free_remaining > 0));
  const freeRemaining =
    typeof user?.ai_free_remaining === "number" ? user.ai_free_remaining : null;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("summary");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [mindmap, setMindmap] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const startSummarize = async () => {
    if (!canUseAi || loading) return;
    setOpen(true);
    setError("");
    setStatus("准备中…");
    setLoading(true);
    setDone(false);
    setSummary("");
    setSubtitle("");
    setSegments([]);
    setMindmap("");
    setTab("summary");

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      await subscribeSummarize(
        jobId,
        (ev) => {
          if (ev.event === "status" && ev.data.message) {
            setStatus(ev.data.message);
          } else if (ev.event === "subtitle" && ev.data.text) {
            setSubtitle(ev.data.text);
            setSegments(ev.data.segments || []);
            setStatus("字幕已提取");
          } else if (ev.event === "content" && ev.data.delta) {
            setSummary((prev) => prev + ev.data.delta);
            setStatus("正在生成总结…");
          } else if (ev.event === "mindmap" && ev.data.markdown) {
            setMindmap(ev.data.markdown);
            setStatus("思维导图已生成");
          } else if (ev.event === "done") {
            setDone(true);
            setStatus("完成");
            setTab("summary");
          } else if (ev.event === "error") {
            setError(ev.data.message || "总结失败");
            setStatus("");
          }
        },
        ac.signal
      );
      // 非 Pro 扣次后刷新剩余次数
      if (!isPro) {
        await refreshMe().catch(() => undefined);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "总结失败");
      await refreshMe().catch(() => undefined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !autoStart || !canUseAi) return;
    void startSummarize();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅随 job / autoStart / canUseAi 变化自动触发
  }, [autoStart, jobId, canUseAi, authLoading]);

  const handleDownloadSubtitle = (format: SubtitleFormat) => {
    if (!subtitle.trim() && segments.length === 0) return;
    downloadSubtitles(segments, format, title || undefined, subtitle);
  };

  const handleCopySummary = async () => {
    const text = summary.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      window.alert("复制失败，请手动选择文本复制");
    }
  };

  const tabs: { id: Tab; label: string; disabled?: boolean }[] = [
    { id: "summary", label: "摘要" },
    { id: "subtitle", label: "字幕", disabled: !subtitle },
    { id: "mindmap", label: "思维导图", disabled: !mindmap },
    { id: "chat", label: "问答", disabled: !subtitle },
  ];

  const actionLabel = loading
    ? "总结中…"
    : done
      ? "重新生成"
      : open
        ? "开始总结"
        : "AI 视频总结";

  if (authLoading) {
    return (
      <div className={`w-full ${className}`}>
        <div className="rounded-xl border border-[#eef0f3] bg-white p-4 text-sm text-[#94a3b8]">
          加载会员状态…
        </div>
      </div>
    );
  }

  if (!canUseAi) {
    return (
      <div className={`w-full ${className}`}>
        <div className="rounded-xl border border-[#1677ff]/20 bg-gradient-to-b from-[#1677ff]/5 to-white p-5 text-center shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <h2 className="text-sm font-bold text-[#0f172a] sm:text-base">
            AI 视频总结
          </h2>
          <p className="mt-2 text-sm text-[#64748b]">
            {user
              ? "免费 3 次已用完。升级 Pro（¥9.9/月）可无限使用摘要、导图与问答。"
              : "登录后可免费体验 3 次 AI 总结；升级 Pro 无限次。"}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {user ? (
              <Link
                href="/pricing"
                className="rounded-full bg-[#1677ff] px-5 py-2 text-sm font-medium text-white hover:bg-[#4096ff]"
              >
                升级 Pro · ¥9.9/月
              </Link>
            ) : (
              <>
                <Link
                  href="/login?next=/pricing"
                  className="rounded-full bg-[#1677ff] px-5 py-2 text-sm font-medium text-white hover:bg-[#4096ff]"
                >
                  登录免费试用
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-full border border-[#1677ff]/30 px-5 py-2 text-sm font-medium text-[#1677ff]"
                >
                  查看定价
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {!open ? (
        <button
          type="button"
          onClick={startSummarize}
          disabled={loading}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-full border border-[#1677ff]/30 bg-[#1677ff]/5 py-3 text-sm font-medium text-[#1677ff] transition-colors hover:bg-[#1677ff]/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex items-center gap-2">
            <span>✨</span>
            {actionLabel}
          </span>
          {!isPro && freeRemaining !== null && (
            <span className="text-xs font-normal text-[#64748b]">
              免费剩余 {freeRemaining} 次
            </span>
          )}
        </button>
      ) : (
        <div className="flex h-full w-full flex-col rounded-xl border border-[#eef0f3] bg-white p-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[#0f172a] sm:text-base">
                AI 视频总结
                {!isPro && freeRemaining !== null && (
                  <span className="ml-2 text-xs font-normal text-[#64748b]">
                    免费剩余 {freeRemaining} 次
                  </span>
                )}
              </h2>
              {status && (
                <p className="mt-0.5 truncate text-xs text-[#64748b]">
                  {loading && !done ? status : status}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={startSummarize}
              disabled={loading || (!isPro && freeRemaining === 0)}
              className="shrink-0 rounded-full border border-[#1677ff]/25 bg-[#1677ff]/5 px-3 py-1 text-xs font-medium text-[#1677ff] hover:bg-[#1677ff]/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLabel}
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5 border-b border-[#f1f5f9] pb-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={t.disabled}
                onClick={() => setTab(t.id)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  tab === t.id
                    ? "bg-[#1677ff] text-white"
                    : "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === "summary" && (
              <div className="min-h-[120px]">
                {loading && !summary && !error && (
                  <p className="animate-pulse text-sm text-[#94a3b8]">
                    {status || "生成中…"}
                  </p>
                )}
                {summary ? (
                  <div className="space-y-2">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleCopySummary}
                        className="rounded-md border border-[#1677ff]/30 bg-white px-2.5 py-1 text-xs font-medium text-[#1677ff] transition-colors hover:bg-[#1677ff]/10"
                      >
                        {copied ? "已复制" : "复制摘要"}
                      </button>
                    </div>
                    <MarkdownContent content={summary} />
                  </div>
                ) : (
                  !loading &&
                  !error && <p className="text-sm text-[#94a3b8]">暂无摘要</p>
                )}
              </div>
            )}

            {tab === "subtitle" && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-[#94a3b8]">
                    {segments.length
                      ? `共 ${segments.length} 条字幕`
                      : "纯文本字幕"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(["srt", "vtt", "txt"] as SubtitleFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        disabled={!subtitle}
                        onClick={() => handleDownloadSubtitle(fmt)}
                        className="rounded-md border border-[#1677ff]/30 bg-white px-2 py-0.5 text-xs font-medium text-[#1677ff] transition-colors hover:bg-[#1677ff]/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <pre className="max-h-[360px] overflow-y-auto whitespace-pre-wrap rounded-xl bg-[#f8fafc] p-3 font-sans text-xs leading-relaxed text-[#334155]">
                  {subtitle || "暂无字幕"}
                </pre>
              </div>
            )}

            {tab === "mindmap" &&
              (mindmap ? (
                <MindMapView markdown={mindmap} title={title} />
              ) : (
                <p className="text-sm text-[#94a3b8]">
                  {loading ? "思维导图生成中…" : "暂无思维导图"}
                </p>
              ))}

            {tab === "chat" && (
              <ChatBox jobId={jobId} disabled={!subtitle || loading} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
