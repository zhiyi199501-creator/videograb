"use client";

import { useEffect, useRef, useState } from "react";
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
}

export default function SummaryPanel({ jobId, title }: SummaryPanelProps) {
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
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const startSummarize = async () => {
    if (loading) return;
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
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "总结失败");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSubtitle = (format: SubtitleFormat) => {
    if (!subtitle.trim() && segments.length === 0) return;
    downloadSubtitles(segments, format, title || undefined, subtitle);
  };

  const tabs: { id: Tab; label: string; disabled?: boolean }[] = [
    { id: "summary", label: "摘要" },
    { id: "subtitle", label: "字幕", disabled: !subtitle },
    { id: "mindmap", label: "思维导图", disabled: !mindmap },
    { id: "chat", label: "问答", disabled: !subtitle },
  ];

  return (
    <div className="mt-6 w-full">
      {!open ? (
        <button
          type="button"
          onClick={startSummarize}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-[#1677ff]/30 bg-[#1677ff]/5 py-3 text-sm font-medium text-[#1677ff] transition-colors hover:bg-[#1677ff]/10"
        >
          <span>✨</span>
          AI 视频总结
        </button>
      ) : (
        <div className="w-full rounded-xl border border-[#eef0f3] bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#0f172a]">AI 视频总结</h2>
              {status && (
                <p className="mt-0.5 text-xs text-[#64748b]">
                  {loading && !done ? `${status}` : status}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {done && (
                <button
                  type="button"
                  onClick={startSummarize}
                  className="rounded-full px-3 py-1 text-xs text-[#64748b] hover:bg-[#f1f5f9]"
                >
                  重新生成
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  abortRef.current?.abort();
                  setOpen(false);
                }}
                className="rounded-full px-3 py-1 text-xs text-[#94a3b8] hover:bg-[#f1f5f9]"
              >
                收起
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5 border-b border-[#f1f5f9] pb-3">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={t.disabled}
                onClick={() => setTab(t.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
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
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {tab === "summary" && (
            <div className="min-h-[160px]">
              {loading && !summary && !error && (
                <p className="animate-pulse text-sm text-[#94a3b8]">
                  {status || "生成中…"}
                </p>
              )}
              {summary ? (
                <MarkdownContent content={summary} />
              ) : (
                !loading &&
                !error && <p className="text-sm text-[#94a3b8]">暂无摘要</p>
              )}
            </div>
          )}

          {tab === "subtitle" && (
            <div className="space-y-3">
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
                      className="rounded-md border border-[#1677ff]/30 bg-white px-2.5 py-1 text-xs font-medium text-[#1677ff] transition-colors hover:bg-[#1677ff]/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      下载 {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <pre className="max-h-[420px] overflow-y-auto whitespace-pre-wrap rounded-xl bg-[#f8fafc] p-3 font-sans text-xs leading-relaxed text-[#334155]">
                {subtitle || "暂无字幕"}
              </pre>
            </div>
          )}

          {tab === "mindmap" &&
            (mindmap ? (
              <MindMapView markdown={mindmap} />
            ) : (
              <p className="text-sm text-[#94a3b8]">
                {loading ? "思维导图生成中…" : "暂无思维导图"}
              </p>
            ))}

          {tab === "chat" && (
            <ChatBox jobId={jobId} disabled={!subtitle || loading} />
          )}
        </div>
      )}
    </div>
  );
}
