// 默认走同源 /api（由 next.config rewrites 代理到后端），避免 localhost/127.0.0.1 混用导致 CORS 失败。
// 需要直连后端时再设 NEXT_PUBLIC_API_URL（如 http://127.0.0.1:8000）。
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

/** Short locale for Accept-Language (zh-CN → zh). */
export function getClientLocale(): string {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return "zh";
  }
  try {
    const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
    if (match?.[1]) {
      const raw = decodeURIComponent(match[1]).trim();
      if (raw) return raw.split("-")[0].toLowerCase();
    }
    const lang = document.documentElement?.lang?.trim();
    if (lang) return lang.split("-")[0].toLowerCase();
  } catch {
    /* ignore */
  }
  return "zh";
}

function localeHeaders(
  extra: Record<string, string> = {}
): Record<string, string> {
  return {
    "Accept-Language": getClientLocale(),
    ...extra,
  };
}

function withAuthHeaders(
  extra: Record<string, string> = {}
): Record<string, string> {
  const headers = localeHeaders(extra);
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("vg_access_token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/** 兼容无协议粘贴，如 bilibili.com/video/BVxxx?... → https://... */
export function normalizeVideoUrl(raw: string): string {
  const url = raw.trim().replace(/^['"]+|['"]+$/g, "");
  if (!url) return url;
  if (/^[a-z][a-z0-9+.\-]*:/i.test(url)) return url;
  if (/^(?:www\.)?[a-z0-9.\-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(url)) {
    return `https://${url}`;
  }
  return url;
}

export interface FormatInfo {
  format_id: string;
  ext: string;
  resolution?: string | null;
  filesize?: number | null;
  vcodec?: string | null;
  acodec?: string | null;
  label: string;
}

export interface JobResponse {
  job_id: string;
  status: string;
  progress: number;
  title?: string | null;
  thumbnail?: string | null;
  duration?: number | null;
  uploader?: string | null;
  formats: FormatInfo[];
  error?: string | null;
  filename?: string | null;
}

export async function extractUrl(url: string): Promise<JobResponse> {
  const normalized = normalizeVideoUrl(url);
  const res = await fetch(`${API_BASE}/api/extract`, {
    method: "POST",
    headers: localeHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ url: normalized }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(
      err.detail || err.error || err.message || "Failed to parse. Please check the link"
    );
  }
  return res.json();
}

export async function getJob(jobId: string): Promise<JobResponse> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
    headers: localeHeaders(),
  });
  if (!res.ok) throw new Error("Job not found");
  return res.json();
}

export async function startDownload(
  jobId: string,
  formatId?: string
): Promise<JobResponse> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/download`, {
    method: "POST",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ format_id: formatId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Download failed" }));
    throw new Error(err.detail || "Download failed");
  }
  return res.json();
}

export async function downloadFile(
  jobId: string,
  filename: string
): Promise<void> {
  // iOS WKWebView: <a download> + blob URLs are unreliable — hand off to native.
  const { nativeDownloadJob } = await import("@/lib/nativeApp");
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("vg_access_token")
      : null;
  if (
    nativeDownloadJob({
      jobId,
      filename,
      token,
      apiBase:
        API_BASE ||
        (typeof window !== "undefined" ? window.location.origin : ""),
    })
  ) {
    return;
  }

  const headers = withAuthHeaders();

  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/file`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Download failed" }));
    throw new Error(err.detail || "Download failed");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function getThumbnailUrl(jobId: string): string {
  return `${API_BASE}/api/jobs/${jobId}/thumbnail`;
}

export function subscribeJobEvents(
  jobId: string,
  onEvent: (data: {
    status: string;
    progress: number;
    error?: string;
    filename?: string;
  }) => void
): () => void {
  const es = new EventSource(`${API_BASE}/api/jobs/${jobId}/events`);

  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent(data);
      if (data.status === "complete" || data.status === "failed") {
        es.close();
      }
    } catch {
      /* ignore parse errors */
    }
  };

  // 不在 onerror 立刻关闭：经代理时偶发断线，浏览器会自动重连；
  // 真正结束由调用方 unsubscribe，或 complete/failed 时关闭。
  es.onerror = () => {
    /* keep open for auto-reconnect */
  };

  return () => es.close();
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDuration(seconds?: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export type SummarizeEventType =
  | "status"
  | "subtitle"
  | "content"
  | "mindmap"
  | "done"
  | "error"
  | "ping"
  | "message";

export interface SubtitleSegment {
  start: number;
  end: number;
  text: string;
}

export interface SummarizeEvent {
  event: SummarizeEventType;
  data: {
    message?: string;
    text?: string;
    source?: string;
    segment_count?: number;
    segments?: SubtitleSegment[];
    delta?: string;
    markdown?: string;
    ok?: boolean;
  };
}

/** 仅去掉 SSE 规范允许的 data: 后可选单个空格，保留内容首尾空白 */
function sseDataPayload(line: string): string {
  const raw = line.slice(5);
  return raw.startsWith(" ") ? raw.slice(1) : raw;
}

function decodeB64Fields(data: SummarizeEvent["data"]): SummarizeEvent["data"] {
  if (typeof window === "undefined" && typeof atob !== "function") {
    return data;
  }
  const next = { ...data } as SummarizeEvent["data"] & Record<string, unknown>;
  const pairs: [keyof SummarizeEvent["data"], string][] = [
    ["delta", "delta_b64"],
    ["text", "text_b64"],
    ["markdown", "markdown_b64"],
    ["message", "message_b64"],
  ];
  for (const [field, b64Key] of pairs) {
    const encoded = next[b64Key];
    if (typeof encoded === "string" && encoded) {
      try {
        const decoded = decodeURIComponent(
          Array.from(atob(encoded), (c) =>
            `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`
          ).join("")
        );
        (next as Record<string, unknown>)[field as string] = decoded;
      } catch {
        /* keep plaintext field */
      }
      delete next[b64Key];
    }
  }
  return next;
}

async function consumeSse(
  res: Response,
  onEvent: (ev: SummarizeEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || err.message || "Request failed");
  }
  if (!res.body) throw new Error("Streaming responses are not supported in this browser");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const currentEvent = "message";

  const flushBlock = (block: string) => {
    const lines = block.split("\n");
    let eventName = currentEvent;
    const dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(sseDataPayload(line));
      }
    }
    if (dataLines.length === 0) return;
    try {
      const raw = JSON.parse(dataLines.join("\n")) as SummarizeEvent["data"];
      onEvent({
        event: eventName as SummarizeEventType,
        data: decodeB64Fields(raw),
      });
    } catch {
      /* ignore malformed chunk */
    }
  };

  while (true) {
    if (signal?.aborted) {
      await reader.cancel().catch(() => undefined);
      break;
    }
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";
    for (const part of parts) {
      if (part.trim()) flushBlock(part);
    }
  }
  if (buffer.trim()) flushBlock(buffer);
}

export function subscribeSummarize(
  jobId: string,
  onEvent: (ev: SummarizeEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("vg_access_token")
      : null;
  const headers = localeHeaders();
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${API_BASE}/api/jobs/${jobId}/summarize`, {
    signal,
    headers,
  }).then((res) => consumeSse(res, onEvent, signal));
}

export function askAboutVideo(
  jobId: string,
  question: string,
  onEvent: (ev: SummarizeEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("vg_access_token")
      : null;
  const headers = localeHeaders({
    "Content-Type": "application/json",
  });
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${API_BASE}/api/jobs/${jobId}/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ question }),
    signal,
  }).then((res) => consumeSse(res, onEvent, signal));
}
