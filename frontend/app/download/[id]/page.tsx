"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import MobileTip from "@/components/download/MobileTip";
import FormatPicker from "@/components/download/FormatPicker";
import ProgressBar from "@/components/download/ProgressBar";
import SummaryPanel from "@/components/summary/SummaryPanel";
import { useAuth } from "@/lib/auth";
import {
  FormatInfo,
  JobResponse,
  downloadFile,
  formatDuration,
  getThumbnailUrl,
  getJob,
  startDownload,
  subscribeJobEvents,
} from "@/lib/api";
import { mergeJobProgress } from "@/lib/jobProgress";

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
  const router = useRouter();
  const jobId = params.id as string;
  const { user, loading: authLoading, refreshMe } = useAuth();

  const [phase, setPhase] = useState<Phase>("extracting");
  const [job, setJob] = useState<JobResponse | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState("");
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [savingFile, setSavingFile] = useState(false);
  const selectedFormatRef = useRef("");
  const autoSavedRef = useRef(false);
  const unsubRef = useRef<(() => void) | undefined>(undefined);
  const cancelledRef = useRef(false);
  const downloadStartedRef = useRef(false);

  useEffect(() => {
    selectedFormatRef.current = selectedFormat;
  }, [selectedFormat]);

  useEffect(() => {
    autoSavedRef.current = false;
    setAutoSaved(false);
    downloadStartedRef.current = false;
  }, [jobId]);

  useEffect(() => {
    if (phase !== "complete" || autoSavedRef.current) return;
    autoSavedRef.current = true;

    const filename = job?.filename || "video.mp4";
    downloadFile(jobId, filename)
      .then(() => setAutoSaved(true))
      .catch(() => {
        autoSavedRef.current = false;
        setAutoSaved(false);
      });
  }, [phase, jobId, job?.filename]);

  useEffect(() => {
    cancelledRef.current = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    const applyJob = (current: JobResponse) => {
      if (cancelledRef.current) return;
      // 已点「开始下载」后，轮询可能仍短暂返回 ready/progress=1，勿把进度和阶段打回去
      if (downloadStartedRef.current && current.status === "ready") {
        setJob(current);
        return;
      }
      if (
        current.status === "complete" ||
        current.status === "failed"
      ) {
        downloadStartedRef.current = false;
      }
      setJob(current);
      setProgress((prev) =>
        mergeJobProgress(prev, current.progress, current.status)
      );
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
      unsubRef.current?.();
      unsubRef.current = subscribeJobEvents(jobId, (data) => {
        if (cancelledRef.current) return;
        setProgress((prev) =>
          mergeJobProgress(prev, data.progress, data.status)
        );
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
              if (latest.status !== "ready") {
                unsubRef.current?.();
                unsubRef.current = undefined;
              }
            }
          } catch {
            /* ignore transient poll errors */
          }
        }, 400);
      } catch (err) {
        if (cancelledRef.current) return;
        setPhase("failed");
        setError(err instanceof Error ? err.message : "加载失败");
      }
    };

    init();
    return () => {
      cancelledRef.current = true;
      unsubRef.current?.();
      unsubRef.current = undefined;
      if (interval) clearInterval(interval);
    };
  }, [jobId]);

  const handleDownload = async () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/download/${jobId}`)}`);
      return;
    }
    if (!user.is_pro && (user.download_free_remaining ?? 0) <= 0) {
      setError("免费下载次数已用完（共 3 次），升级 Pro 可无限次下载");
      return;
    }

    downloadStartedRef.current = true;
    setDownloading(true);
    setError("");
    setPhase("downloading");
    setProgress(0.05);

    try {
      await startDownload(jobId, selectedFormat);
      await refreshMe().catch(() => undefined);
      unsubRef.current?.();
      unsubRef.current = subscribeJobEvents(jobId, (data) => {
        if (cancelledRef.current) return;
        setProgress((prev) =>
          mergeJobProgress(prev, data.progress, data.status)
        );
        const next = statusToPhase(data.status);
        if (next) setPhase(next);
        if (data.status === "complete") {
          downloadStartedRef.current = false;
          getJob(jobId)
            .then((current) => {
              if (cancelledRef.current) return;
              setJob(current);
              setProgress((prev) =>
                mergeJobProgress(prev, current.progress, current.status)
              );
            })
            .catch(() => undefined);
        } else if (data.status === "failed") {
          downloadStartedRef.current = false;
          setError(data.error || "下载失败");
        }
      });
      const current = await getJob(jobId);
      setJob(current);
      setProgress((prev) =>
        mergeJobProgress(prev, current.progress, current.status)
      );
      const next = statusToPhase(current.status);
      if (next) setPhase(next);
      if (current.status === "failed") {
        downloadStartedRef.current = false;
        setError(current.error || "下载失败");
      }
    } catch (err) {
      downloadStartedRef.current = false;
      setPhase("failed");
      setError(err instanceof Error ? err.message : "下载失败");
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveFile = async () => {
    setSavingFile(true);
    setError("");
    try {
      await downloadFile(jobId, job?.filename || "video.mp4");
      setAutoSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSavingFile(false);
    }
  };

  const showSplit =
    phase === "ready" || phase === "downloading" || phase === "complete";
  const downloadRemaining =
    typeof user?.download_free_remaining === "number"
      ? user.download_free_remaining
      : null;
  const quotaExhausted = !!user && !user.is_pro && downloadRemaining === 0;
  const loginNext = `/login?next=${encodeURIComponent(`/download/${jobId}`)}`;

  return (
    <div className="mx-auto max-w-6xl px-3 py-3 sm:px-5 sm:py-4">
      <MobileTip />

      <Link
        href="/"
        className="mb-3 inline-flex items-center gap-1 text-xs text-[#64748b] hover:text-[#1677ff] sm:text-sm"
      >
        ← 返回首页
      </Link>

      {phase === "extracting" && (
        <div className="rounded-xl bg-white p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] sm:p-8">
          <div className="animate-pulse space-y-4">
            <div className="mx-auto h-36 w-full max-w-sm rounded-xl bg-[#f0f1f2]" />
            <div className="mx-auto h-4 w-3/4 rounded bg-[#f0f1f2]" />
            <div className="mx-auto h-4 w-1/2 rounded bg-[#f0f1f2]" />
          </div>
          <p className="mt-5 text-center text-sm text-[#64748b]">
            正在解析视频信息...
          </p>
          <div className="mt-3">
            <ProgressBar progress={progress || 0.1} />
          </div>
        </div>
      )}

      {showSplit && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
          {/* 左栏 ~40%：视频信息 / 下载 */}
          <div className="w-full shrink-0 lg:w-[40%]">
            {phase === "ready" && job && (
              <div className="rounded-xl bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  {!thumbError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getThumbnailUrl(jobId)}
                      alt={job.title || "缩略图"}
                      onError={() => setThumbError(true)}
                      className="h-36 w-full shrink-0 rounded-lg object-cover sm:h-28 sm:w-40 lg:h-32 lg:w-full xl:h-28 xl:w-40"
                    />
                  ) : (
                    <div className="flex h-36 w-full shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1677ff]/10 to-[#4096ff]/5 sm:h-28 sm:w-40 lg:h-32 lg:w-full xl:h-28 xl:w-40">
                      <span className="text-3xl opacity-60">🎬</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h1 className="line-clamp-2 text-sm font-bold text-[#0f172a] sm:text-base">
                      {job.title}
                    </h1>
                    <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-[#94a3b8]">
                      {job.uploader && <span>{job.uploader}</span>}
                      {job.duration != null && (
                        <span>· {formatDuration(job.duration)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <FormatPicker
                    formats={job.formats as FormatInfo[]}
                    selected={selectedFormat}
                    onSelect={setSelectedFormat}
                  />
                </div>

                <button
                  type="button"
                  onClick={!user ? () => router.push(loginNext) : handleDownload}
                  disabled={
                    downloading || !selectedFormat || authLoading || quotaExhausted
                  }
                  className="mt-4 w-full rounded-full bg-[#1677ff] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4096ff] disabled:opacity-60"
                >
                  {downloading
                    ? "准备下载..."
                    : authLoading
                      ? "加载中…"
                      : !user
                        ? "登录后免费下载"
                        : user.is_pro
                          ? "开始下载"
                          : quotaExhausted
                            ? "免费次数已用完"
                            : `开始下载（剩余 ${downloadRemaining} 次）`}
                </button>
                {!user && !authLoading && (
                  <p className="mt-2 text-center text-xs text-[#64748b]">
                    登录后可免费下载 3 次
                  </p>
                )}
                {user && !user.is_pro && downloadRemaining !== null && (
                  <p className="mt-2 text-center text-xs text-[#64748b]">
                    免费下载剩余 {downloadRemaining} 次
                  </p>
                )}
                {quotaExhausted && (
                  <Link
                    href="/pricing"
                    className="mt-2 block text-center text-xs font-medium text-[#1677ff] hover:underline"
                  >
                    升级 Pro 无限下载
                  </Link>
                )}
              </div>
            )}

            {phase === "downloading" && (
              <div className="rounded-xl bg-white p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                <h2 className="mb-3 line-clamp-2 text-center text-sm font-bold text-[#0f172a]">
                  {job?.title || "正在下载"}
                </h2>
                <ProgressBar
                  progress={Math.max(progress, 0.05)}
                  label="下载进度"
                />
                <p className="mt-3 text-center text-xs text-[#94a3b8]">
                  进度为服务器拉取视频；完成后浏览器还会再传到本机，请保持页面打开
                </p>
              </div>
            )}

            {phase === "complete" && (
              <div className="rounded-xl bg-white p-5 text-center shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-2xl">
                  ✅
                </div>
                <h2 className="text-base font-bold text-[#0f172a]">
                  {autoSaved ? "已开始保存！" : "下载完成！"}
                </h2>
                <p className="mt-1.5 line-clamp-2 text-sm text-[#64748b]">
                  {job?.title || job?.filename}
                </p>
                <p className="mt-1 text-xs text-[#94a3b8]">
                  {autoSaved
                    ? "若浏览器未弹出保存，请点击下方按钮重试"
                    : "正在唤起保存…"}
                </p>
                <button
                  type="button"
                  onClick={handleSaveFile}
                  disabled={savingFile}
                  className="mt-4 inline-block w-full rounded-full bg-[#1677ff] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4096ff] disabled:opacity-60"
                >
                  {savingFile
                    ? "保存中…"
                    : autoSaved
                      ? "再次保存到手机 / 电脑"
                      : "保存到手机 / 电脑"}
                </button>
                <Link
                  href="/"
                  className="mt-3 block text-sm text-[#1677ff] hover:underline"
                >
                  继续下载其他视频
                </Link>
              </div>
            )}
          </div>

          {/* 右栏 ~60%：AI 总结（解析后自动触发） */}
          <div className="min-h-[420px] w-full lg:min-h-[520px] lg:w-[60%]">
            <SummaryPanel
              jobId={jobId}
              title={job?.title}
              autoStart
              className="h-full"
            />
          </div>
        </div>
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
