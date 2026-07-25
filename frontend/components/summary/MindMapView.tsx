"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Transformer } from "markmap-lib";
import { Markmap } from "markmap-view";

interface MindMapViewProps {
  markdown: string;
}

const EXPORT_PADDING = 24;
const PNG_SCALE = 2.5;

const TOOLBAR_BTN =
  "rounded-md border border-[#1677ff]/30 bg-white/95 px-2.5 py-1 text-xs font-medium text-[#1677ff] shadow-sm backdrop-blur-sm transition-colors hover:bg-[#1677ff]/10 disabled:cursor-not-allowed disabled:opacity-50";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function timestampSuffix() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function stripCrossOriginResources(root: ParentNode) {
  root.querySelectorAll("img, image").forEach((el) => {
    const src =
      el.getAttribute("src") ||
      el.getAttribute("href") ||
      el.getAttributeNS("http://www.w3.org/1999/xlink", "href") ||
      "";
    if (/^(\/\/|https?:)/i.test(src)) {
      el.remove();
    }
  });
  root.querySelectorAll('link[rel="stylesheet"]').forEach((el) => el.remove());
}

/** 将 foreignObject 转为 SVG text，避免 Canvas 光栅化时丢字 */
function flattenForeignObjects(root: ParentNode) {
  root.querySelectorAll("foreignObject").forEach((fo) => {
    const x = parseFloat(fo.getAttribute("x") || "0");
    const y = parseFloat(fo.getAttribute("y") || "0");
    const w = parseFloat(fo.getAttribute("width") || "0");
    const text = (fo.textContent || "").trim();
    if (!text) {
      fo.remove();
      return;
    }
    const svgNS = "http://www.w3.org/2000/svg";
    const textEl = document.createElementNS(svgNS, "text");
    textEl.setAttribute("x", String(x));
    textEl.setAttribute("y", String(y + 14));
    textEl.setAttribute("fill", "#0f172a");
    textEl.setAttribute("font-size", "14");
    textEl.setAttribute(
      "font-family",
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif'
    );
    // 简单按宽度折行
    const maxChars = Math.max(8, Math.floor(w / 8) || 20);
    const lines = text.match(new RegExp(`.{1,${maxChars}}`, "g")) || [text];
    lines.forEach((line, i) => {
      const tspan = document.createElementNS(svgNS, "tspan");
      tspan.setAttribute("x", String(x));
      tspan.setAttribute("dy", i === 0 ? "0" : "18");
      tspan.textContent = line;
      textEl.appendChild(tspan);
    });
    fo.replaceWith(textEl);
  });
}

function buildExportSvg(
  markmap: Markmap,
  sourceSvg: SVGSVGElement,
  forPng = false,
): { svgString: string; width: number; height: number } | null {
  const { x1, y1, x2, y2 } = markmap.state.rect;
  if (x2 <= x1 || y2 <= y1) return null;

  const width = x2 - x1 + EXPORT_PADDING * 2;
  const height = y2 - y1 + EXPORT_PADDING * 2;
  const vbX = x1 - EXPORT_PADDING;
  const vbY = y1 - EXPORT_PADDING;

  const clone = sourceSvg.cloneNode(true) as SVGSVGElement;
  const rootG = clone.querySelector(":scope > g");
  if (rootG) rootG.removeAttribute("transform");
  stripCrossOriginResources(clone);
  if (forPng) flattenForeignObjects(clone);

  const styles = markmap.getStyleContent();
  const contentHtml = rootG
    ? new XMLSerializer().serializeToString(rootG)
    : "";

  const svgString = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml"
  viewBox="${vbX} ${vbY} ${width} ${height}" width="${width}" height="${height}" class="markmap">
  <rect x="${vbX}" y="${vbY}" width="${width}" height="${height}" fill="#ffffff"/>
  <style><![CDATA[
${styles}
foreignObject { overflow: visible; }
.markmap-foreign, .markmap-foreign div {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans SC", sans-serif;
}
text {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif;
}
  ]]></style>
  ${contentHtml}
</svg>`;

  return { svgString, width, height };
}

function svgToPng(
  svgString: string,
  width: number,
  height: number,
  scale: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(width * scale);
        canvas.height = Math.ceil(height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("无法创建 canvas 上下文"));
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("PNG 导出失败"));
          },
          "image/png",
          1,
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error("SVG 渲染为图片失败"));
    img.src = svgDataUrl;
  });
}

export default function MindMapView({ markdown }: MindMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const mmRef = useRef<Markmap | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exporting, setExporting] = useState<"svg" | "png" | null>(null);

  useEffect(() => {
    if (!svgRef.current || !markdown.trim()) return;

    const transformer = new Transformer();
    const { root } = transformer.transform(markdown);

    let cancelled = false;

    const render = async () => {
      if (!svgRef.current) return;
      if (!mmRef.current) {
        mmRef.current = Markmap.create(svgRef.current, {
          zoom: true,
          pan: true,
          autoFit: true,
          duration: 300,
          maxWidth: 280,
        });
      }
      if (cancelled) return;
      await mmRef.current.setData(root);
      mmRef.current.fit();
    };

    render().catch((err) => console.error("思维导图渲染失败:", err));

    return () => {
      cancelled = true;
    };
  }, [markdown]);

  useEffect(() => {
    return () => {
      mmRef.current?.destroy();
      mmRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      const active =
        document.fullscreenElement === containerRef.current;
      setIsFullscreen(active);
      requestAnimationFrame(() => {
        mmRef.current?.fit().catch(() => undefined);
      });
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const getExportData = useCallback((forPng = false) => {
    const markmap = mmRef.current;
    const svg = svgRef.current;
    if (!markmap || !svg) {
      throw new Error("思维导图尚未就绪，请稍后再试");
    }
    const data = buildExportSvg(markmap, svg, forPng);
    if (!data) throw new Error("思维导图内容为空，无法导出");
    return data;
  }, []);

  const handleDownloadSvg = useCallback(async () => {
    if (exporting) return;
    setExporting("svg");
    try {
      const { svgString } = getExportData(false);
      const blob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      downloadBlob(blob, `mindmap${timestampSuffix()}.svg`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "SVG 导出失败";
      console.error(msg, err);
      window.alert(msg);
    } finally {
      setExporting(null);
    }
  }, [exporting, getExportData]);

  const handleDownloadPng = useCallback(async () => {
    if (exporting) return;
    setExporting("png");
    try {
      const { svgString, width, height } = getExportData(true);
      const blob = await svgToPng(svgString, width, height, PNG_SCALE);
      downloadBlob(blob, `mindmap${timestampSuffix()}.png`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "PNG 导出失败";
      console.error(msg, err);
      window.alert(msg);
    } finally {
      setExporting(null);
    }
  }, [exporting, getExportData]);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;

    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else {
        window.alert("当前浏览器不支持全屏功能");
      }
    } catch (err) {
      console.error("全屏切换失败:", err);
      window.alert("全屏切换失败，请重试");
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-[480px] w-full overflow-hidden rounded-xl border border-[#eef0f3] bg-[#fafbfc] fullscreen:h-full fullscreen:rounded-none fullscreen:border-0 fullscreen:bg-white sm:h-[520px]"
    >
      <div className="absolute top-2 right-2 z-10 flex flex-wrap justify-end gap-1.5">
        <button
          type="button"
          onClick={toggleFullscreen}
          className={TOOLBAR_BTN}
        >
          {isFullscreen ? "退出全屏" : "全屏"}
        </button>
        <button
          type="button"
          onClick={handleDownloadSvg}
          disabled={!!exporting}
          className={TOOLBAR_BTN}
        >
          {exporting === "svg" ? "导出中…" : "下载 SVG"}
        </button>
        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={!!exporting}
          className={TOOLBAR_BTN}
        >
          {exporting === "png" ? "导出中…" : "下载 PNG"}
        </button>
      </div>

      <svg ref={svgRef} className="h-full w-full" />

      <p className="pointer-events-none absolute right-3 bottom-2 text-[10px] text-[#94a3b8]">
        滚轮缩放 · 拖拽平移
      </p>
    </div>
  );
}
