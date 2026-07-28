export interface SubtitleSegment {
  start: number;
  end: number;
  text: string;
}

function pad2(n: number) {
  return String(Math.floor(n)).padStart(2, "0");
}

function pad3(n: number) {
  return String(Math.floor(n)).padStart(3, "0");
}

/** SRT: 00:00:01,000 */
export function formatSrtTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s - Math.floor(s)) * 1000);
  return `${pad2(h)}:${pad2(m)}:${pad2(sec)},${pad3(ms)}`;
}

/** VTT: 00:00:01.000 */
export function formatVttTime(seconds: number): string {
  return formatSrtTime(seconds).replace(",", ".");
}

export function segmentsToSrt(segments: SubtitleSegment[]): string {
  const blocks: string[] = [];
  let idx = 1;
  for (const seg of segments) {
    const text = (seg.text || "").trim();
    if (!text) continue;
    const end = seg.end > seg.start ? seg.end : seg.start + 2;
    blocks.push(
      `${idx}\n${formatSrtTime(seg.start)} --> ${formatSrtTime(end)}\n${text}`
    );
    idx += 1;
  }
  return blocks.join("\n\n") + (blocks.length ? "\n" : "");
}

export function segmentsToVtt(segments: SubtitleSegment[]): string {
  const blocks: string[] = ["WEBVTT", ""];
  for (const seg of segments) {
    const text = (seg.text || "").trim();
    if (!text) continue;
    const end = seg.end > seg.start ? seg.end : seg.start + 2;
    blocks.push(
      `${formatVttTime(seg.start)} --> ${formatVttTime(end)}\n${text}\n`
    );
  }
  return blocks.join("\n");
}

export function segmentsToTxt(segments: SubtitleSegment[]): string {
  const lines: string[] = [];
  for (const seg of segments) {
    const text = (seg.text || "").trim();
    if (!text) continue;
    lines.push(`[${formatSrtTime(seg.start).replace(",", ".")}] ${text}`);
  }
  return lines.join("\n") + (lines.length ? "\n" : "");
}

export function safeFilename(name: string, fallback = "download"): string {
  const cleaned = name.replace(/[\\/:*?"<>|]+/g, "_").trim();
  return cleaned.slice(0, 80) || fallback;
}

/** 解析展示用字幕行 `[mm:ss] text` / `[hh:mm:ss] text` 为分段 */
export function parseSubtitleText(raw: string): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];
  const re = /^\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]\s*(.+)$/;
  for (const line of raw.split(/\r?\n/)) {
    const m = line.trim().match(re);
    if (!m) continue;
    let start: number;
    let text: string;
    if (m[3] !== undefined) {
      start = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
      text = m[4];
    } else {
      start = Number(m[1]) * 60 + Number(m[2]);
      text = m[4];
    }
    if (!text?.trim()) continue;
    const prev = segments[segments.length - 1];
    if (prev && !(prev.end > prev.start)) {
      prev.end = Math.max(start, prev.start + 0.5);
    }
    segments.push({ start, end: start + 2, text: text.trim() });
  }
  return segments;
}

export function downloadTextFile(content: string, filename: string) {
  // 用 octet-stream，避免浏览器把 text/* 强制存成 .txt，忽略 .srt/.vtt 后缀
  const blob = new Blob([content], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type SubtitleFormat = "srt" | "vtt" | "txt";

export function downloadSubtitles(
  segments: SubtitleSegment[],
  format: SubtitleFormat,
  title?: string,
  fallbackText?: string
) {
  let segs = segments;
  if (segs.length === 0 && fallbackText?.trim()) {
    segs = parseSubtitleText(fallbackText);
  }
  const base = safeFilename(title || "subtitle", "subtitle");
  if (format === "srt") {
    const body =
      segs.length > 0 ? segmentsToSrt(segs) : `${fallbackText || ""}\n`;
    downloadTextFile(body, `${base}.srt`);
  } else if (format === "vtt") {
    const body =
      segs.length > 0
        ? segmentsToVtt(segs)
        : `WEBVTT\n\n${fallbackText || ""}\n`;
    downloadTextFile(body, `${base}.vtt`);
  } else {
    const body =
      segs.length > 0 ? segmentsToTxt(segs) : `${fallbackText || ""}\n`;
    downloadTextFile(body, `${base}.txt`);
  }
}
