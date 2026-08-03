"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "@/components/layout/LocaleSwitcher";
import { useAuth } from "@/lib/auth";

function AuthSlot() {
  const t = useTranslations("nav");
  const { user, loading, logout } = useAuth();
  // 避免 SSR 与客户端首屏因 localStorage 会话不一致导致 hydration 报错
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready || loading) {
    return (
      <span
        className="inline-block h-8 w-16 rounded-full bg-[#f1f5f9]"
        aria-hidden
      />
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="max-w-[140px] truncate text-sm text-[#64748b]">
          {user.email}
          {user.is_pro && (
            <span className="ml-1.5 rounded bg-[#1677ff]/10 px-1.5 py-0.5 text-xs font-medium text-[#1677ff]">
              Pro
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={logout}
          className="rounded-full border border-[#e2e8f0] px-3 py-1.5 text-sm text-[#020817] hover:border-[#1677ff]"
        >
          {t("logout")}
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="rounded-full bg-[#1677ff] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#4096ff]"
    >
      {t("login")}
    </Link>
  );
}

export default function Navbar() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  const navItems = [
    { href: "/", label: t("home") },
    { href: "/#how-to-use", label: t("howTo") },
    { href: "/#comparison", label: t("comparison") },
    { href: "/#faq", label: t("faq") },
    { href: "/pricing", label: t("pricing") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[#e8eef5]/80 bg-white/75 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#1677ff] to-[#38bdf8] text-sm font-bold text-white shadow-[0_4px_12px_-4px_rgba(22,119,255,0.5)]">
            V
          </div>
          <span className="text-base font-bold tracking-tight text-[#0f172a]">
            VideoGrab
          </span>
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-[#020817] transition-colors hover:text-[#1677ff]"
            >
              {item.label}
            </Link>
          ))}
          <LocaleSwitcher />
          <AuthSlot />
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <LocaleSwitcher />
          <button
            type="button"
            className="rounded-lg p-2 text-[#0f172a]"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={tc("menu")}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[#f0f1f2] bg-white px-4 py-3 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block py-2 text-sm text-[#020817]"
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <>
              <p className="py-2 text-sm text-[#64748b]">
                {user.email}
                {user.is_pro ? " · Pro" : ""}
              </p>
              <button
                type="button"
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                }}
                className="mt-1 w-full rounded-full border border-[#e2e8f0] py-2 text-sm"
              >
                {t("logout")}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="mt-2 block w-full rounded-full bg-[#1677ff] py-2 text-center text-sm font-medium text-white"
              onClick={() => setMobileOpen(false)}
            >
              {t("login")}
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
