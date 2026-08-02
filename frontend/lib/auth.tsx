"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const TOKEN_KEY = "vg_access_token";

export interface AuthUser {
  id: string;
  email: string;
  is_pro: boolean;
  can_download?: boolean;
  download_free_limit?: number;
  download_free_used?: number;
  download_free_remaining?: number | null;
  subscription: {
    plan?: string | null;
    status?: string | null;
    current_period_end?: number | null;
  } | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function parseError(res: Response): Promise<string> {
  const err = await res.json().catch(() => ({ detail: "Request failed" }));
  const detail = err.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg || JSON.stringify(d)).join("; ");
  }
  return err.message || "Request failed";
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function authHeaders(
  extra?: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = { ...(extra || {}) };
  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((accessToken: string, nextUser: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    setToken(accessToken);
    setUser(nextUser);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const refreshMe = useCallback(async () => {
    const t = getStoredToken();
    if (!t) {
      clearSession();
      return;
    }
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!res.ok) {
      clearSession();
      return;
    }
    const me = (await res.json()) as AuthUser;
    setToken(t);
    setUser(me);
  }, [clearSession]);

  useEffect(() => {
    refreshMe().finally(() => setLoading(false));
  }, [refreshMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(await parseError(res));
      const data = await res.json();
      applySession(data.access_token, data.user);
    },
    [applySession]
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(await parseError(res));
      const data = await res.json();
      applySession(data.access_token, data.user);
    },
    [applySession]
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
      refreshMe,
    }),
    [user, token, loading, login, register, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export async function createCheckoutSession(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/billing/checkout`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  if (!data.url) throw new Error("No checkout URL returned");
  return data.url as string;
}

export async function createPortalSession(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/billing/portal`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  if (!data.url) throw new Error("No billing portal URL returned");
  return data.url as string;
}
