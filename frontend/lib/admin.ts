"use client";

import { useAuth, authHeaders, getStoredToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function adminFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...authHeaders(
        (init?.headers as Record<string, string> | undefined) || undefined
      ),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail =
      typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function useAdminGate(): {
  loading: boolean;
  allowed: boolean;
  token: string | null;
} {
  const { user, loading, token } = useAuth();
  const allowed = !!user?.is_admin && !!token;
  return { loading, allowed, token: token ?? getStoredToken() };
}

export type Overview = {
  pv_today: number;
  uv_today: number;
  pv_7d: number;
  uv_7d: number;
  users_total: number;
  pro_count: number;
  logins_24h: number;
};

export type Visits = {
  days: number;
  daily: { day: string; pv: number; uv: number }[];
  top_paths: { path: string; hits: number }[];
};

export type LoginItem = {
  id: string;
  user_id: string | null;
  email: string;
  event: string;
  created_at: string;
};

export type AdminUser = {
  id: string;
  email: string;
  is_pro: boolean;
  download_free_used: number;
  download_free_limit: number;
  created_at: string;
  subscription: {
    plan?: string | null;
    status?: string | null;
    current_period_end?: number | null;
    has_stripe?: boolean;
  } | null;
};

export type SystemMetrics = {
  cpu_percent: number;
  memory: { total_mb: number; used_mb: number; percent: number };
  load_avg: number[] | null;
  cpu_count: number;
};
