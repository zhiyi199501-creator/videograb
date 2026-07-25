"use client";

import { useEffect, useRef } from "react";
import { Transformer } from "markmap-lib";
import { Markmap } from "markmap-view";

interface MindMapViewProps {
  markdown: string;
}

export default function MindMapView({ markdown }: MindMapViewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const mmRef = useRef<Markmap | null>(null);

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

    render().catch(() => undefined);

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

  return (
    <div className="relative h-[480px] w-full overflow-hidden rounded-xl border border-[#eef0f3] bg-[#fafbfc] sm:h-[520px]">
      <svg ref={svgRef} className="h-full w-full" />
      <p className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-[#94a3b8]">
        滚轮缩放 · 拖拽平移
      </p>
    </div>
  );
}
