"use client";

import { useEffect, useState } from "react";
import {
  adminFetch,
  type Overview,
  type Visits,
} from "@/lib/admin";

function StatCard({
  label,
  value,
  tip,
}: {
  label: string;
  value: number | string;
  tip: string;
}) {
  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-white p-4">
      <div className="flex items-center gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">
          {label}
        </p>
        <span className="group relative inline-flex">
          <button
            type="button"
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[#cbd5e1] hover:text-[#64748b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1677ff]/40"
            aria-label={tip}
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden
            >
              <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM7.25 5a.75.75 0 011.5 0v.01a.75.75 0 01-1.5 0V5zM8 7.25a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0V8A.75.75 0 018 7.25z" />
            </svg>
          </button>
          <span
            role="tooltip"
            className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 w-52 -translate-x-1/2 rounded-lg bg-[#0f172a] px-2.5 py-2 text-left text-[11px] leading-snug font-normal normal-case tracking-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          >
            {tip}
          </span>
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-[#0f172a]">
        {value}
      </p>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [visits, setVisits] = useState<Visits | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [o, v] = await Promise.all([
          adminFetch<Overview>("/api/admin/overview"),
          adminFetch<Visits>("/api/admin/visits?days=7"),
        ]);
        if (!cancelled) {
          setOverview(o);
          setVisits(v);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (!overview || !visits) {
    return <p className="text-sm text-[#64748b]">加载统计…</p>;
  }

  const maxPv = Math.max(1, ...visits.daily.map((d) => d.pv));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[#0f172a]">总览</h1>
        <p className="mt-1 text-sm text-[#64748b]">访问、用户与登录概况</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="今日 PV"
          value={overview.pv_today}
          tip="今天 0 点起的页面浏览次数；同一访客多次打开会累加。"
        />
        <StatCard
          label="今日 UV"
          value={overview.uv_today}
          tip="今天 0 点起访问过站点的独立访客数（按浏览器匿名 ID 去重）。"
        />
        <StatCard
          label="7 日 PV"
          value={overview.pv_7d}
          tip="含今天在内近 7 天的页面浏览总次数。"
        />
        <StatCard
          label="7 日 UV"
          value={overview.uv_7d}
          tip="含今天在内近 7 天的独立访客数（按访客 ID 去重）。"
        />
        <StatCard
          label="注册用户"
          value={overview.users_total}
          tip="系统中已注册账号的总数（不限是否 Pro）。"
        />
        <StatCard
          label="Pro 会员"
          value={overview.pro_count}
          tip="当前有效的 Pro 用户数（含人工开通与 Stripe 订阅）。"
        />
        <StatCard
          label="24h 登录/注册"
          value={overview.logins_24h}
          tip="过去 24 小时内登录成功与注册成功的次数合计；同一人多次登录会累加，失败登录不计。"
        />
      </div>

      <section className="rounded-xl border border-[#e2e8f0] bg-white p-4 sm:p-6">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-[#0f172a]">
          近 7 日趋势
          <span className="group relative inline-flex">
            <button
              type="button"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[#cbd5e1] hover:text-[#64748b]"
              aria-label="按日展示近 7 天 PV；柱顶数字为当日 PV"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden
              >
                <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM7.25 5a.75.75 0 011.5 0v.01a.75.75 0 01-1.5 0V5zM8 7.25a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0V8A.75.75 0 018 7.25z" />
              </svg>
            </button>
            <span
              role="tooltip"
              className="pointer-events-none absolute left-0 top-full z-20 mt-1.5 w-56 rounded-lg bg-[#0f172a] px-2.5 py-2 text-left text-[11px] leading-snug font-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            >
              按日展示近 7 天页面浏览量（PV）；悬停柱子可看当日 PV / UV。
            </span>
          </span>
        </h2>
        <div className="mt-4 flex h-44 gap-2">
          {visits.daily.map((d) => {
            const barPct =
              d.pv <= 0 ? 0 : Math.max(6, Math.round((d.pv / maxPv) * 100));
            return (
              <div
                key={d.day}
                className="flex h-full min-w-0 flex-1 flex-col items-center gap-1.5"
              >
                <div className="relative flex w-full flex-1 items-end justify-center">
                  <div
                    className="w-full max-w-[48px] rounded-t-md bg-[#1677ff] transition-all"
                    style={{ height: `${barPct}%` }}
                    title={`${d.day}: PV ${d.pv} / UV ${d.uv}`}
                  />
                  {d.pv > 0 ? (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] tabular-nums text-[#64748b]">
                      {d.pv}
                    </span>
                  ) : null}
                </div>
                <span className="shrink-0 text-[10px] text-[#94a3b8]">
                  {d.day.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
        {visits.daily.every((d) => d.pv === 0) ? (
          <p className="mt-2 text-center text-xs text-[#94a3b8]">
            暂无访问数据，浏览站点页面后会显示柱状图
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-[#e2e8f0] bg-white p-4 sm:p-6">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-[#0f172a]">
          热门路径
          <span className="group relative inline-flex">
            <button
              type="button"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[#cbd5e1] hover:text-[#64748b]"
              aria-label="近 7 天访问次数最多的页面路径"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden
              >
                <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM7.25 5a.75.75 0 011.5 0v.01a.75.75 0 01-1.5 0V5zM8 7.25a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0V8A.75.75 0 018 7.25z" />
              </svg>
            </button>
            <span
              role="tooltip"
              className="pointer-events-none absolute left-0 top-full z-20 mt-1.5 w-56 rounded-lg bg-[#0f172a] px-2.5 py-2 text-left text-[11px] leading-snug font-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            >
              近 7 天访问次数最多的页面路径（Top 20）。
            </span>
          </span>
        </h2>
        {visits.top_paths.length === 0 ? (
          <p className="mt-3 text-sm text-[#94a3b8]">暂无数据</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#f1f5f9]">
            {visits.top_paths.map((p) => (
              <li
                key={p.path}
                className="flex items-center justify-between py-2 text-sm"
              >
                <code className="truncate text-[#0f172a]">{p.path}</code>
                <span className="ml-4 tabular-nums text-[#64748b]">
                  {p.hits}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
