"use client";

import { useEffect, useState } from "react";
import { adminFetch, type LoginItem } from "@/lib/admin";

type LoginsResp = {
  total: number;
  items: LoginItem[];
};

const EVENT_LABEL: Record<string, string> = {
  login: "登录成功",
  register: "注册",
  login_failed: "登录失败",
};

export default function AdminLoginsPage() {
  const [data, setData] = useState<LoginsResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch<LoginsResp>(
          "/api/admin/logins?limit=100&offset=0"
        );
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#0f172a]">登录监控</h1>
        <p className="mt-1 text-sm text-[#64748b]">最近注册与登录事件</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!data ? (
        <p className="text-sm text-[#64748b]">加载中…</p>
      ) : (
        <>
          <p className="text-xs text-[#94a3b8]">共 {data.total} 条</p>
          <div className="overflow-x-auto rounded-xl border border-[#e2e8f0] bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[#e2e8f0] bg-[#f8fafc] text-xs text-[#64748b]">
                <tr>
                  <th className="px-4 py-3 font-medium">时间</th>
                  <th className="px-4 py-3 font-medium">事件</th>
                  <th className="px-4 py-3 font-medium">邮箱</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {data.items.map((ev) => (
                  <tr key={ev.id}>
                    <td className="px-4 py-3 text-xs tabular-nums text-[#94a3b8]">
                      {ev.created_at.replace("T", " ").slice(0, 19)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          ev.event === "login_failed"
                            ? "text-red-600"
                            : "text-[#0f172a]"
                        }
                      >
                        {EVENT_LABEL[ev.event] || ev.event}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#0f172a]">{ev.email}</td>
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
