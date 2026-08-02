"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { SubtitleSegment, subscribeSummarize } from "@/lib/api";
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
  /** 挂载后自动开始总结 */
  autoStart?: boolean;
  className?: string;
}

export default function SummaryPanel({
  jobId,
  title,
  autoStart = false,
  className = "",
}: SummaryPanelProps) {
  const t = useTranslations("summary");
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
  const startedForRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const startSummarize = async () => {
    if (loading) return;
    setOpen(true);
    setError("");
    setStatus(t("preparing"));
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
      let finished = false;
      await subscribeSummarize(
        jobId,
        (ev) => {
          if (ev.event === "status" && ev.data.message) {
            setStatus(ev.data.message);
          } else if (ev.event === "subtitle" && ev.data.text) {
            setSubtitle(ev.data.text);
            setSegments(ev.data.segments || []);
            setStatus(t("subtitleReady"));
          } else if (ev.event === "content" && ev.data.delta) {
            setSummary((prev) => prev + ev.data.delta);
            setStatus(t("generatingSummary"));
          } else if (ev.event === "mindmap") {
            const md = ev.data.markdown || "";
            setMindmap(md);
            setStatus(md ? t("mindmapReady") : t("mindmapEmptyDone"));
          } else if (ev.event === "done") {
            finished = true;
            setDone(true);
            setStatus(t("done"));
            setTab("summary");
          } else if (ev.event === "error") {
            finished = true;
            setError(ev.data.message || t("failed"));
            setStatus("");
          }
        },
        ac.signal
      );
      if (!finished && !ac.signal.aborted) {
        setError(t("connectionLost"));
        setStatus("");
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : t("failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!autoStart || startedForRef.current === jobId) return;
    startedForRef.current = jobId;
    const timer = setTimeout(() => void startSummarize(), 0);
    return () => {
      clearTimeout(timer);
      if (startedForRef.current === jobId) startedForRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅随 job / autoStart 变化自动触发
  }, [autoStart, jobId]);

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
      window.alert(t("copyFailed"));
    }
  };

  const tabs: { id: Tab; label: string; disabled?: boolean }[] = [
    { id: "summary", label: t("tabSummary") },
    { id: "subtitle", label: t("tabSubtitle"), disabled: !subtitle },
    { id: "mindmap", label: t("tabMindmap"), disabled: !mindmap },
    { id: "chat", label: t("tabChat"), disabled: !subtitle },
  ];

  const actionLabel = loading
    ? t("summarizing")
    : done
      ? t("regenerate")
      : open
        ? t("start")
        : t("aiButton");

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
        </button>
      ) : (
        <div className="flex h-full w-full flex-col rounded-xl border border-[#eef0f3] bg-white p-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[#0f172a] sm:text-base">
                {t("title")}
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
              disabled={loading}
              className="shrink-0 rounded-full border border-[#1677ff]/25 bg-[#1677ff]/5 px-3 py-1 text-xs font-medium text-[#1677ff] hover:bg-[#1677ff]/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLabel}
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5 border-b border-[#f1f5f9] pb-2">
            {tabs.map((tabItem) => (
              <button
                key={tabItem.id}
                type="button"
                disabled={tabItem.disabled}
                onClick={() => setTab(tabItem.id)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  tab === tabItem.id
                    ? "bg-[#1677ff] text-white"
                    : "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]"
                }`}
              >
                {tabItem.label}
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
                    {status || t("generating")}
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
                        {copied ? t("copied") : t("copySummary")}
                      </button>
                    </div>
                    <MarkdownContent content={summary} />
                  </div>
                ) : (
                  !loading &&
                  !error && (
                    <p className="text-sm text-[#94a3b8]">{t("noSummary")}</p>
                  )
                )}
              </div>
            )}

            {tab === "subtitle" && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-[#94a3b8]">
                    {segments.length
                      ? t("subtitleCount", { count: segments.length })
                      : t("plainSubtitle")}
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
                  {subtitle || t("noSubtitle")}
                </pre>
              </div>
            )}

            {tab === "mindmap" &&
              (mindmap ? (
                <MindMapView markdown={mindmap} title={title} />
              ) : (
                <p className="text-sm text-[#94a3b8]">
                  {loading ? t("mindmapGenerating") : t("noMindmap")}
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
