"use client";

import Link from "next/link";
import { useState } from "react";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/#platforms", label: "支持平台" },
  { href: "/pricing", label: "定价" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#f0f1f2] bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1677ff] text-sm font-bold text-white">
            V
          </div>
          <span className="text-base font-bold text-[#0f172a]">VideoGrab</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-[#020817] transition-colors hover:text-[#1677ff]"
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            className="rounded-full bg-[#1677ff] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#4096ff]"
          >
            登录
          </button>
        </nav>

        <button
          type="button"
          className="md:hidden rounded-lg p-2 text-[#0f172a]"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="菜单"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
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
          <button
            type="button"
            className="mt-2 w-full rounded-full bg-[#1677ff] py-2 text-sm font-medium text-white"
          >
            登录
          </button>
        </div>
      )}
    </header>
  );
}
