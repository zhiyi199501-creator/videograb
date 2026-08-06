/** Detect VideoGrab native shells (WKWebView iOS app). */

export type NativePlatform = "ios";

/** App Store–oriented shell: AI summary first, no video download UI. */
export type NativeAppMode = "ai-summary" | "full";

export interface VideoGrabNativeBridge {
  platform: NativePlatform;
  version?: string;
  /** Default for iOS App Store build: ai-summary */
  mode?: NativeAppMode;
  downloadJob?: (payload: {
    jobId: string;
    filename: string;
    token?: string | null;
    apiBase?: string;
  }) => void;
  openExternal?: (url: string) => void;
  shareBlob?: (payload: {
    filename: string;
    mimeType?: string;
    base64: string;
  }) => void;
}

declare global {
  interface Window {
    VideoGrabNative?: VideoGrabNativeBridge;
    webkit?: {
      messageHandlers?: {
        vgDownload?: { postMessage: (msg: unknown) => void };
        vgOpenExternal?: { postMessage: (msg: unknown) => void };
        vgShareBlob?: { postMessage: (msg: unknown) => void };
      };
    };
  }
}

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  if (window.VideoGrabNative?.platform === "ios") return true;
  return /VideoGrabiOS\//i.test(navigator.userAgent || "");
}

export function getNativeAppMode(): NativeAppMode | null {
  if (!isNativeApp()) return null;
  const mode = window.VideoGrabNative?.mode;
  if (mode === "full" || mode === "ai-summary") return mode;
  // iOS shell defaults to AI-first even if an older bridge omitted `mode`.
  return "ai-summary";
}

export function isAiSummaryApp(): boolean {
  return getNativeAppMode() === "ai-summary";
}

export function nativeDownloadJob(payload: {
  jobId: string;
  filename: string;
  token?: string | null;
  apiBase?: string;
}): boolean {
  if (typeof window === "undefined") return false;
  // AI-first shell: never hand off video file downloads.
  if (isAiSummaryApp()) return false;
  if (window.VideoGrabNative?.downloadJob) {
    window.VideoGrabNative.downloadJob(payload);
    return true;
  }
  const handler = window.webkit?.messageHandlers?.vgDownload;
  if (handler) {
    handler.postMessage(payload);
    return true;
  }
  return false;
}

export function nativeOpenExternal(url: string): boolean {
  if (typeof window === "undefined") return false;
  if (window.VideoGrabNative?.openExternal) {
    window.VideoGrabNative.openExternal(url);
    return true;
  }
  const handler = window.webkit?.messageHandlers?.vgOpenExternal;
  if (handler) {
    handler.postMessage({ url });
    return true;
  }
  return false;
}

/** Share a small file (subtitle / mindmap export) via the iOS share sheet. */
export async function nativeShareBlob(
  blob: Blob,
  filename: string
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const canShare =
    !!window.VideoGrabNative?.shareBlob ||
    !!window.webkit?.messageHandlers?.vgShareBlob;
  if (!canShare) return false;

  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const base64 = btoa(binary);
  const payload = {
    filename,
    mimeType: blob.type || "application/octet-stream",
    base64,
  };
  if (window.VideoGrabNative?.shareBlob) {
    window.VideoGrabNative.shareBlob(payload);
    return true;
  }
  window.webkit!.messageHandlers!.vgShareBlob!.postMessage(payload);
  return true;
}
