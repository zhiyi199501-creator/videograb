"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Transformer } from "markmap-lib";
import { Markmap } from "markmap-view";
import { safeFilename } from "@/lib/subtitleFormat";

interface MindMapViewProps {
  markdown: string;
  /** 导出文件名（与视频标题一致） */
  title?: string | null;
}

const EXPORT_PADDING = 56;
const PNG_SCALE = 2.5;
const NODE_FONT_SIZE = 14;

const TOOLBAR_BTN =
  "rounded-md border border-[#1677ff]/30 bg-white/95 px-2.5 py-1 text-xs font-medium text-[#1677ff] shadow-sm backdrop-blur-sm transition-colors hover:bg-[#1677ff]/10 disabled:cursor-not-allowed disabled:opacity-50";

async function downloadBlob(blob: Blob, filename: string) {
  try {
    const { nativeShareBlob } = await import("@/lib/nativeApp");
    if (await nativeShareBlob(blob, filename)) return;
  } catch {
    /* fall through */
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
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

/**
 * 将 foreignObject 转为单行 SVG text。
 * 不换行：多行会超出 markmap 节点间距，导致导出图文字互相重叠。
 * y 取节点垂直中线（与分支线对齐），用 dominant-baseline 贴紧底线。
 */
function flattenForeignObjects(root: ParentNode) {
  root.querySelectorAll("foreignObject").forEach((fo) => {
    const x = parseFloat(fo.getAttribute("x") || "0");
    const y = parseFloat(fo.getAttribute("y") || "0");
    const h = parseFloat(fo.getAttribute("height") || "0") || NODE_FONT_SIZE * 1.6;
    const text = (fo.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) {
      fo.remove();
      return;
    }
    // markmap 分支线穿过节点中心；文字基线略低于中线，视觉上贴紧色线
    const midY = y + h / 2;
    const baselineY = midY + NODE_FONT_SIZE * 0.32;

    const svgNS = "http://www.w3.org/2000/svg";
    const textEl = document.createElementNS(svgNS, "text");
    textEl.setAttribute("x", String(x));
    textEl.setAttribute("y", String(baselineY));
    textEl.setAttribute("fill", "#0f172a");
    textEl.setAttribute("font-size", String(NODE_FONT_SIZE));
    textEl.setAttribute("dominant-baseline", "alphabetic");
    textEl.setAttribute(
      "font-family",
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif'
    );
    textEl.textContent = text;
    fo.replaceWith(textEl);
  });
}

/** 将 clone 挂到 DOM 测真实包围盒，避免右侧文字超出 viewBox */
function measureContentBox(
  svg: SVGSVGElement,
  fallback: { x: number; y: number; width: number; height: number }
) {
  const wrap = document.createElement("div");
  wrap.style.cssText =
    "position:fixed;left:-100000px;top:0;width:8000px;height:4000px;overflow:hidden;pointer-events:none;opacity:0;";
  document.body.appendChild(wrap);
  wrap.appendChild(svg);
  try {
    const g = svg.querySelector(":scope > g");
    if (!g) return fallback;
    const box = (g as SVGGraphicsElement).getBBox();
    if (!Number.isFinite(box.width) || box.width <= 0) return fallback;
    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    };
  } catch {
    return fallback;
  } finally {
    wrap.remove();
  }
}

/** markmap.fit() 依赖绝对像素宽高；百分比会触发 SVGLength NotSupportedError */
function applySvgPixelSize(svg: SVGSVGElement, width: number, height: number) {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));
  svg.style.width = `${w}px`;
  svg.style.height = `${h}px`;
}

async function safeFit(markmap: Markmap | null) {
  if (!markmap) return;
  try {
    await markmap.fit();
  } catch (err) {
    console.warn("Mind map fit failed:", err);
  }
}

function buildExportSvg(
  markmap: Markmap,
  sourceSvg: SVGSVGElement
): { svgString: string; width: number; height: number } | null {
  const { x1, y1, x2, y2 } = markmap.state.rect;
  if (x2 <= x1 || y2 <= y1) return null;

  const clone = sourceSvg.cloneNode(true) as SVGSVGElement;
  // 导出用绝对尺寸占位，便于挂载测量
  clone.setAttribute("width", "2400");
  clone.setAttribute("height", "1600");
  clone.removeAttribute("viewBox");
  const rootG = clone.querySelector(":scope > g");
  if (rootG) rootG.removeAttribute("transform");
  stripCrossOriginResources(clone);
  // PNG / SVG 都扁平化文字，保证导出边界与可见文字一致
  flattenForeignObjects(clone);

  const measured = measureContentBox(clone, {
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1,
  });

  const vbX = measured.x - EXPORT_PADDING;
  const vbY = measured.y - EXPORT_PADDING;
  const width = measured.width + EXPORT_PADDING * 2;
  const height = measured.height + EXPORT_PADDING * 2;

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
  errors: { canvasFailed: string; pngExportFailed: string; svgRenderFailed: string }
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
          reject(new Error(errors.canvasFailed));
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error(errors.pngExportFailed));
          },
          "image/png",
          1
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error(errors.svgRenderFailed));
    img.src = svgDataUrl;
  });
}

export default function MindMapView({ markdown, title }: MindMapViewProps) {
  const t = useTranslations("summary");
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const mmRef = useRef<Markmap | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exporting, setExporting] = useState<"svg" | "png" | null>(null);

  const defaultName = t("mindmapDefaultName");
  const exportBaseName = safeFilename(title || defaultName, defaultName);

  const syncSvgSize = useCallback(() => {
    const container = containerRef.current;
    const svg = svgRef.current;
    if (!container || !svg) return false;
    const rect = container.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    applySvgPixelSize(svg, rect.width, rect.height);
    return true;
  }, []);

  // 容器尺寸变化时写入绝对像素，避免百分比触发 SVGLength 错误
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onResize = () => {
      if (!syncSvgSize()) return;
      void safeFit(mmRef.current);
    };

    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [syncSvgSize]);

  useEffect(() => {
    if (!svgRef.current || !markdown.trim()) return;

    const transformer = new Transformer();
    const { root } = transformer.transform(markdown);

    let cancelled = false;

    const render = async () => {
      // 等布局完成再读尺寸
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      if (cancelled || !svgRef.current) return;
      if (!syncSvgSize()) {
        // 尺寸尚未就绪，下一帧再试一次
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        if (cancelled || !svgRef.current || !syncSvgSize()) return;
      }

      if (!mmRef.current) {
        mmRef.current = Markmap.create(svgRef.current, {
          zoom: true,
          pan: true,
          autoFit: false,
          duration: 300,
          // 不限制宽度、不换行，避免相邻分支文字纵向重叠
          maxWidth: 0,
          spacingVertical: 16,
          spacingHorizontal: 100,
        });
      }
      if (cancelled) return;
      await mmRef.current.setData(root);
      await safeFit(mmRef.current);
    };

    render().catch((err) => console.error("Mind map render failed:", err));

    return () => {
      cancelled = true;
    };
  }, [markdown, syncSvgSize]);

  useEffect(() => {
    return () => {
      mmRef.current?.destroy();
      mmRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      const active = document.fullscreenElement === containerRef.current;
      setIsFullscreen(active);
      requestAnimationFrame(() => {
        syncSvgSize();
        void safeFit(mmRef.current);
      });
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [syncSvgSize]);

  const getExportData = useCallback(() => {
    const markmap = mmRef.current;
    const svg = svgRef.current;
    if (!markmap || !svg) {
      throw new Error(t("mindmapNotReady"));
    }
    const data = buildExportSvg(markmap, svg);
    if (!data) throw new Error(t("mindmapEmptyExport"));
    return data;
  }, [t]);

  const handleDownloadSvg = useCallback(async () => {
    if (exporting) return;
    setExporting("svg");
    try {
      const { svgString } = getExportData();
      const blob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      await downloadBlob(blob, `${exportBaseName}.svg`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("svgExportFailed");
      console.error(msg, err);
      window.alert(msg);
    } finally {
      setExporting(null);
    }
  }, [exporting, exportBaseName, getExportData, t]);

  const handleDownloadPng = useCallback(async () => {
    if (exporting) return;
    setExporting("png");
    try {
      const { svgString, width, height } = getExportData();
      const blob = await svgToPng(svgString, width, height, PNG_SCALE, {
        canvasFailed: t("canvasFailed"),
        pngExportFailed: t("pngExportFailed"),
        svgRenderFailed: t("svgRenderFailed"),
      });
      await downloadBlob(blob, `${exportBaseName}.png`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("pngExportFailed");
      console.error(msg, err);
      window.alert(msg);
    } finally {
      setExporting(null);
    }
  }, [exporting, exportBaseName, getExportData, t]);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;

    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else {
        window.alert(t("fullscreenUnsupported"));
      }
    } catch (err) {
      console.error("Fullscreen toggle failed:", err);
      window.alert(t("fullscreenFailed"));
    }
  }, [t]);

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
          {isFullscreen ? t("exitFullscreen") : t("fullscreen")}
        </button>
        <button
          type="button"
          onClick={handleDownloadSvg}
          disabled={!!exporting}
          className={TOOLBAR_BTN}
        >
          {exporting === "svg" ? t("exporting") : t("downloadSvg")}
        </button>
        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={!!exporting}
          className={TOOLBAR_BTN}
        >
          {exporting === "png" ? t("exporting") : t("downloadPng")}
        </button>
      </div>

      {/* 不用 Tailwind h-full/w-full 百分比，改由 JS 写入像素宽高 */}
      <svg ref={svgRef} className="block" />

      <p className="pointer-events-none absolute right-3 bottom-2 text-[10px] text-[#94a3b8]">
        {t("zoomHint")}
      </p>
    </div>
  );
}
