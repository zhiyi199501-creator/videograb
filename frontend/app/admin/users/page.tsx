"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch, type AdminUser } from "@/lib/admin";

type UsersResp = {
  total: number;
  items: AdminUser[];
  limit: number;
  offset: number;
};

type TypeFilter = "all" | "normal" | "pro";

const TYPE_LABEL: Record<TypeFilter, string> = {
  all: "全部",
  normal: "普通用户",
  pro: "PRO 会员",
};

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [data, setData] = useState<UsersResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setError(null);
    const params = new URLSearchParams({ limit: "50", offset: "0" });
    if (q.trim()) params.set("q", q.trim());
    if (typeFilter === "pro") params.set("pro", "1");
    if (typeFilter === "normal") params.set("pro", "0");
    try {
      const res = await adminFetch<UsersResp>(`/api/admin/users?${params}`);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    }
  }, [q, typeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!filterOpen) return;
    function onDocClick(e: MouseEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(e.target as Node)
      ) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [filterOpen]);

  async function setPro(userId: string, action: "grant" | "revoke") {
    setBusyId(userId);
    try {
      await adminFetch(`/api/admin/users/${userId}/pro`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#0f172a]">用户</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          查看会员并人工开通或撤销（不经 Stripe）
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="搜索邮箱"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm outline-none focus:border-[#1677ff]"
        />

        <div className="relative" ref={filterRef}>
          <button
            type="button"
            onClick={() => setFilterOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#0f172a] hover:border-[#1677ff]"
            aria-expanded={filterOpen}
            aria-haspopup="listbox"
          >
            <span className="text-[#64748b]">用户类型</span>
            <span className="font-medium">{TYPE_LABEL[typeFilter]}</span>
            <svg
              className={`h-4 w-4 text-[#94a3b8] transition-transform ${
                filterOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {filterOpen ? (
            <ul
              role="listbox"
              className="absolute left-0 z-20 mt-1 min-w-full overflow-hidden rounded-lg border border-[#e2e8f0] bg-white py-1 shadow-md"
            >
              {(Object.keys(TYPE_LABEL) as TypeFilter[]).map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={typeFilter === key}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-[#f8fafc] ${
                      typeFilter === key
                        ? "font-medium text-[#1677ff]"
                        : "text-[#0f172a]"
                    }`}
                    onClick={() => {
                      setTypeFilter(key);
                      setFilterOpen(false);
                    }}
                  >
                    {TYPE_LABEL[key]}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm hover:border-[#1677ff]"
        >
          刷新
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!data ? (
        <p className="text-sm text-[#64748b]">加载中…</p>
      ) : (
        <>
          <p className="text-xs text-[#94a3b8]">共 {data.total} 人</p>
          <div className="overflow-x-auto rounded-xl border border-[#e2e8f0] bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[#e2e8f0] bg-[#f8fafc] text-xs text-[#64748b]">
                <tr>
                  <th className="px-4 py-3 font-medium">邮箱</th>
                  <th className="px-4 py-3 font-medium">Pro</th>
                  <th className="px-4 py-3 font-medium">下载额度</th>
                  <th className="px-4 py-3 font-medium">注册</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {data.items.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 text-[#0f172a]">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.is_pro ? (
                        <span className="rounded bg-[#1677ff]/10 px-1.5 py-0.5 text-xs font-medium text-[#1677ff]">
                          Pro
                          {u.subscription?.has_stripe ? " · Stripe" : " · 人工"}
                        </span>
                      ) : (
                        <span className="text-[#94a3b8]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[#64748b]">
                      {u.is_pro
                        ? "无限"
                        : `${u.download_free_used}/${u.download_free_limit}`}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#94a3b8]">
                      {u.created_at?.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3">
                      {u.is_pro ? (
                        <button
                          type="button"
                          disabled={busyId === u.id}
                          onClick={() => void setPro(u.id, "revoke")}
                          className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          撤销 Pro
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === u.id}
                          onClick={() => void setPro(u.id, "grant")}
                          className="rounded-lg border border-[#1677ff]/30 px-2.5 py-1 text-xs text-[#1677ff] hover:bg-[#1677ff]/5 disabled:opacity-50"
                        >
                          开通 Pro
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
