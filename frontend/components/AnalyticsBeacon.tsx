"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getStoredToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
const VID_KEY = "vg_vid";

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `v-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(VID_KEY, id);
    }
    return id;
  } catch {
    return `anon-${Date.now()}`;
  }
}

function clientLocale(): string {
  try {
    const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]).split("-")[0];
    return document.documentElement.lang?.split("-")[0] || "zh";
  } catch {
    return "zh";
  }
}

export default function AnalyticsBeacon() {
  const pathname = usePathname();
  const last = useRef<string>("");

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    if (pathname === last.current) return;
    last.current = pathname;

    const body = JSON.stringify({
      path: pathname,
      visitor_id: getVisitorId(),
      locale: clientLocale(),
    });
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const url = `${API_BASE}/api/analytics/pageview`;
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        // sendBeacon can't set Authorization; fall back to fetch when logged in
        if (!token) {
          navigator.sendBeacon(url, blob);
          return;
        }
      }
      void fetch(url, { method: "POST", headers, body, keepalive: true });
    } catch {
      /* ignore */
    }
  }, [pathname]);

  return null;
}
