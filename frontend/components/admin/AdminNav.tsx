"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "总览" },
  { href: "/admin/users", label: "用户" },
  { href: "/admin/logins", label: "登录" },
  { href: "/admin/system", label: "系统" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-[#e2e8f0] bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="text-sm font-bold text-[#0f172a]">
            VideoGrab Admin
          </Link>
          <nav className="flex flex-wrap gap-1">
            {NAV.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    active
                      ? "bg-[#1677ff]/10 font-medium text-[#1677ff]"
                      : "text-[#64748b] hover:text-[#0f172a]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-[#64748b]">
          <span className="max-w-[180px] truncate">{user?.email}</span>
          <Link href="/" className="hover:text-[#1677ff]">
            回站点
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-[#e2e8f0] px-2.5 py-1 hover:border-[#1677ff]"
          >
            退出
          </button>
        </div>
      </div>
    </header>
  );
}
