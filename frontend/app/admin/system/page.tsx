"use client";

import { useEffect, useState } from "react";
import { adminFetch, type SystemMetrics } from "@/lib/admin";

function Bar({ percent, label }: { percent: number; label: string }) {
  const p = Math.min(100, Math.max(0, percent));
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-[#64748b]">{label}</span>
        <span className="tabular-nums font-medium text-[#0f172a]">
          {p.toFixed(1)}%
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[#e2e8f0]">
        <div
          className="h-full rounded-full bg-[#1677ff] transition-all duration-500"
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminSystemPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const m = await adminFetch<SystemMetrics>("/api/admin/system");
        if (!cancelled) {
          setMetrics(m);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
      }
    }

    void tick();
    const id = window.setInterval(() => void tick(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#0f172a]">系统资源</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          后端进程所在环境的 CPU / 内存（Docker 内为容器视角），约 5 秒刷新
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!metrics ? (
        <p className="text-sm text-[#64748b]">加载中…</p>
      ) : (
        <div className="max-w-lg space-y-6 rounded-xl border border-[#e2e8f0] bg-white p-6">
          <Bar percent={metrics.cpu_percent} label="CPU" />
          <Bar percent={metrics.memory.percent} label="内存" />
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[#94a3b8]">已用内存</dt>
              <dd className="mt-0.5 tabular-nums text-[#0f172a]">
                {metrics.memory.used_mb} MB
              </dd>
            </div>
            <div>
              <dt className="text-[#94a3b8]">总内存</dt>
              <dd className="mt-0.5 tabular-nums text-[#0f172a]">
                {metrics.memory.total_mb} MB
              </dd>
            </div>
            <div>
              <dt className="text-[#94a3b8]">逻辑核数</dt>
              <dd className="mt-0.5 tabular-nums text-[#0f172a]">
                {metrics.cpu_count}
              </dd>
            </div>
            <div>
              <dt className="text-[#94a3b8]">Load avg</dt>
              <dd className="mt-0.5 tabular-nums text-[#0f172a]">
                {metrics.load_avg
                  ? metrics.load_avg.map((n) => n.toFixed(2)).join(" / ")
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
