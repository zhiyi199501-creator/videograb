"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const { register, user, loading } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, router, next]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(email.trim(), password);
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("registerFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-black text-[#0f172a]">
            {t("registerTitle")}
          </h1>
          <p className="mt-2 text-sm text-[#64748b]">{t("registerLead")}</p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-[#0f172a]">
                {t("email")}
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-sm outline-none focus:border-[#1677ff]"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#0f172a]">
                {t("passwordMin")}
              </span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-sm outline-none focus:border-[#1677ff]"
              />
            </label>
            {error && (
              <p className="text-sm text-red-500" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#1677ff] py-2.5 text-sm font-medium text-white hover:bg-[#4096ff] disabled:opacity-60"
            >
              {submitting ? t("registering") : t("registerTitle")}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-[#64748b]">
            {t("hasAccount")}{" "}
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="text-[#1677ff] hover:underline"
            >
              {t("loginLink")}
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
