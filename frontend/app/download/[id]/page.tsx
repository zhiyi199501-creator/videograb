"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import MobileTip from "@/components/download/MobileTip";
import FormatPicker from "@/components/download/FormatPicker";
import ProgressBar from "@/components/download/ProgressBar";
import SummaryPanel from "@/components/summary/SummaryPanel";
import {
  FormatInfo,
  JobResponse,
  formatDuration,
  getFileUrl,
  getThumbnailUrl,
  getJob,
  startDownload,
  subscribeJobEvents,
} from "@/lib/api";

type Phase = "extracting" | "ready" | "downloading" | "complete" | "failed";

function statusToPhase(status: string): Phase | null {
  if (status === "ready") return "ready";
  if (status === "complete") return "complete";
  if (status === "failed") return "failed";
  if (status === "downloading") return "downloading";
  if (status === "extracting" || status === "pending") return "extracting";
  return null;
}

function pickDefaultFormat(formats: FormatInfo[]): string {
  const videos = formats.filter((f) => f.vcodec !== "none");
  if (videos.length === 0) return formats[0]?.format_id ?? "";
  return videos.reduce((best, f) =>
    (f.filesize ?? Number.MAX_SAFE_INTEGER) <
    (best.filesize ?? Number.MAX_SAFE_INTEGER)
      ? f
      : best
  ).format_id;
}

export default function DownloadPage() {
  const params = useParams();
  const jobId = params.id as string;

  const [phase, setPhase] = useState<Phase>("extracting");
  const [job, setJob] = useState<JobResponse | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState("");
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const selectedFormatRef = useRef("");
  const autoSavedRef = useRef(false);

  useEffect(() => {
    selectedFormatRef.current = selectedFormat;
  }, [selectedFormat]);

  // 切换任务时重置自动保存标记
  useEffect(() => {
    autoSavedRef.current = false;
    setAutoSaved(false);
  }, [jobId]);

  // 服务端下载完成后，自动触发浏览器保存
  useEffect(() => {
    if (phase !== "complete" || autoSavedRef.current) return;
    autoSavedRef.current = true;

    const filename = job?.filename || "video.mp4";
    const url = getFileUrl(jobId);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setAutoSaved(true);
  }, [phase, jobId, job?.filename]);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;
    let interval: ReturnType<typeof setInterval> | undefined;

    const applyJob = (current: JobResponse) => {
      if (cancelled) return;
      setJob(current);
      setProgress((prev) => Math.max(prev, current.progress));
      const next = statusToPhase(current.status);
      if (next) setPhase(next);
      if (current.status === "failed") {
        setError(current.error || "操作失败");
      }
      if (
        current.status === "ready" &&
        current.formats.length > 0 &&
        !selectedFormatRef.current
      ) {
        setSelectedFormat(pickDefaultFormat(current.formats));
      }
    };

    const pollOnce = async () => {
      const current = await getJob(jobId);
      applyJob(current);
      return current;
    };

    const startWatching = () => {
      unsub?.();
      unsub = subscribeJobEvents(jobId, (data) => {
        if (cancelled) return;
        setProgress((prev) => Math.max(prev, data.progress));
        const next = statusToPhase(data.status);
        if (next) setPhase(next);
        if (data.status === "ready" || data.status === "complete") {
          pollOnce().catch(() => undefined);
        } else if (data.status === "failed") {
          setError(data.error || "操作失败");
        }
      });
    };

    const init = async () => {
      try {
        const current = await pollOnce();
        // ready/complete/failed 仍保留轮询，下载阶段靠轮询兜底（SSE 经代理可能缓冲/断开）
        if (
          current.status === "extracting" ||
          current.status === "pending" ||
          current.status === "downloading"
        ) {
          startWatching();
        }

        interval = setInterval(async () => {
          try {
            const latest = await pollOnce();
            if (
              latest.status === "ready" ||
              latest.status === "complete" ||
              latest.status === "failed"
            ) {
              // 解析完成可停 SSE；下载完成也停
              if (latest.status !== "ready") {
                unsub?.();
                unsub = undefined;
              }
            }
          } catch {
            /* ignore transient poll errors */
          }
        }, 400);
      } catch (err) {
        if (cancelled) return;
        setPhase("failed");
        setError(err instanceof Error ? err.message : "加载失败");
      }
    };

    init();
    return () => {
      cancelled = true;
      unsub?.();
      if (interval) clearInterval(interval);
    };
  }, [jobId]);

  const handleDownload = async () => {
    setDownloading(true);
    setError("");
    setPhase("downloading");
    setProgress(0.05);

    try {
      await startDownload(jobId, selectedFormat);
      // 立即拉一次状态；后续由 useEffect 的 interval 持续同步
      const current = await getJob(jobId);
      setJob(current);
      setProgress((prev) => Math.max(prev, current.progress));
      const next = statusToPhase(current.status);
      if (next) setPhase(next);
      if (current.status === "failed") {
        setError(current.error || "下载失败");
      }
    } catch (err) {
      setPhase("failed");
      setError(err instanceof Error ? err.message : "下载失败");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <MobileTip />

      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-[#64748b] hover:text-[#1677ff]"
      >
        ← 返回首页
      </Link>

      {phase === "extracting" && (
        <div className="rounded-xl bg-white p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <div className="animate-pulse space-y-4">
            <div className="mx-auto h-40 w-full max-w-sm rounded-xl bg-[#f0f1f2]" />
            <div className="mx-auto h-4 w-3/4 rounded bg-[#f0f1f2]" />
            <div className="mx-auto h-4 w-1/2 rounded bg-[#f0f1f2]" />
          </div>
          <p className="mt-6 text-center text-sm text-[#64748b]">
            正在解析视频信息...
          </p>
          <div className="mt-4">
            <ProgressBar progress={progress || 0.1} />
          </div>
        </div>
      )}

      {phase === "ready" && job && (
        <div className="rounded-xl bg-white p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col gap-6 sm:flex-row">
            {!thumbError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getThumbnailUrl(jobId)}
                alt={job.title || "缩略图"}
                onError={() => setThumbError(true)}
                className="h-44 w-full shrink-0 rounded-xl object-cover sm:h-36 sm:w-48"
              />
            ) : (
              <div className="flex h-44 w-full shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1677ff]/10 to-[#4096ff]/5 sm:h-36 sm:w-48">
                <span className="text-4xl opacity-60">🎬</span>
              </div>
            )}
            <div className="flex-1">
              <h1 className="line-clamp-2 text-base font-bold text-[#0f172a]">
                {job.title}
              </h1>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#94a3b8]">
                {job.uploader && <span>{job.uploader}</span>}
                {job.duration != null && (
                  <span>· {formatDuration(job.duration)}</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <FormatPicker
              formats={job.formats as FormatInfo[]}
              selected={selectedFormat}
              onSelect={setSelectedFormat}
            />
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || !selectedFormat}
            className="mt-6 w-full rounded-full bg-[#1677ff] py-3 text-sm font-medium text-white transition-colors hover:bg-[#4096ff] disabled:opacity-60"
          >
            {downloading ? "准备下载..." : "开始下载"}
          </button>
        </div>
      )}

      {phase === "downloading" && (
        <div className="rounded-xl bg-white p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <h2 className="mb-4 text-center text-base font-bold text-[#0f172a]">
            {job?.title || "正在下载"}
          </h2>
          <ProgressBar progress={Math.max(progress, 0.05)} label="下载进度" />
          <p className="mt-4 text-center text-xs text-[#94a3b8]">
            请保持页面打开，完成后将自动保存到本地
          </p>
        </div>
      )}

      {phase === "complete" && (
        <div className="rounded-xl bg-white p-8 text-center shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-3xl">
            ✅
          </div>
          <h2 className="text-lg font-bold text-[#0f172a]">
            {autoSaved ? "已开始保存！" : "下载完成！"}
          </h2>
          <p className="mt-2 line-clamp-2 text-sm text-[#64748b]">
            {job?.title || job?.filename}
          </p>
          <p className="mt-2 text-xs text-[#94a3b8]">
            {autoSaved
              ? "若浏览器未弹出保存，请点击下方按钮重试"
              : "正在唤起保存…"}
          </p>
          <a
            href={getFileUrl(jobId)}
            download={job?.filename || "video.mp4"}
            className="mt-6 inline-block w-full rounded-full bg-[#1677ff] py-3 text-sm font-medium text-white transition-colors hover:bg-[#4096ff] sm:w-auto sm:px-12"
          >
            {autoSaved ? "再次保存到手机 / 电脑" : "保存到手机 / 电脑"}
          </a>
          <Link
            href="/"
            className="mt-4 block text-sm text-[#1677ff] hover:underline"
          >
            继续下载其他视频
          </Link>
        </div>
      )}

      {(phase === "ready" ||
        phase === "downloading" ||
        phase === "complete") && (
          <SummaryPanel jobId={jobId} title={job?.title} />
        )}

      {phase === "failed" && (
        <div className="rounded-xl bg-white p-8 text-center shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">
            ❌
          </div>
          <h2 className="text-lg font-bold text-[#0f172a]">操作失败</h2>
          <p className="mt-2 text-sm text-red-500">{error}</p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-full bg-[#1677ff] px-8 py-3 text-sm font-medium text-white hover:bg-[#4096ff]"
          >
            返回重试
          </Link>
        </div>
      )}
    </div>
  );
}
