"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  createCheckoutSession,
  createPortalSession,
  useAuth,
} from "@/lib/auth";

export default function PricingContent() {
  const t = useTranslations("pricing");
  const { user, loading } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState("");

  const plans = [
    {
      id: "free" as const,
      name: "Free",
      price: "¥0",
      period: t("freePeriod"),
      desc: t("freeDesc"),
      features: [t("freeF1"), t("freeF2"), t("freeF3"), t("freeF4")],
      highlighted: false,
    },
    {
      id: "pro" as const,
      name: "Pro",
      price: "¥9.9",
      period: t("proPeriod"),
      original: t("proOriginal"),
      desc: t("proDesc"),
      features: [
        t("proF1"),
        t("proF2"),
        t("proF3"),
        t("proF4"),
        t("proF5"),
      ],
      highlighted: true,
    },
  ];

  const onUpgrade = async () => {
    setError("");
    if (!user) {
      router.push("/login?next=/pricing");
      return;
    }
    if (user.is_pro) return;
    setBusy("checkout");
    try {
      const url = await createCheckoutSession();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("checkoutFailed"));
      setBusy(null);
    }
  };

  const onManage = async () => {
    setError("");
    setBusy("portal");
    try {
      const url = await createPortalSession();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("portalFailed"));
      setBusy(null);
    }
  };

  return (
    <>
      <Navbar />
      <main className="relative flex-1 overflow-hidden px-4 py-12 sm:px-6 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(22,119,255,0.08),_transparent_55%)]"
        />
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-black tracking-tight text-[#0f172a] sm:text-4xl">
            {t("titleBefore")}
            <span className="text-[#1677ff]"> {t("titleAccent")}</span>
          </h1>
          <p className="mt-3 text-sm text-[#64748b] sm:text-base">{t("lead")}</p>
          {!loading && user?.is_pro && (
            <p className="mt-3 inline-flex rounded-full bg-[#1677ff]/10 px-3 py-1 text-sm font-medium text-[#1677ff]">
              {t("alreadyPro")}
            </p>
          )}
        </div>

        {error && (
          <p className="mx-auto mt-6 max-w-lg text-center text-sm text-red-500">
            {error}
          </p>
        )}

        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-6 sm:mt-12 md:grid-cols-2 md:items-stretch">
          {plans.map((plan) => {
            const isProCard = plan.id === "pro";
            let cta = t("currentPlan");
            let disabled = true;
            let onClick: (() => void) | undefined;

            if (plan.id === "free") {
              cta = user?.is_pro
                ? t("backDownload")
                : user
                  ? t("currentPlan")
                  : t("startFree");
              disabled = !!user && !user.is_pro;
              onClick = () => router.push("/");
            } else if (isProCard) {
              if (user?.is_pro) {
                cta = busy === "portal" ? t("opening") : t("manageSub");
                disabled = busy !== null;
                onClick = onManage;
              } else {
                cta = busy === "checkout" ? t("redirectPay") : t("upgradePro");
                disabled = busy !== null || loading;
                onClick = onUpgrade;
              }
            }

            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl p-6 sm:p-7 ${
                  plan.highlighted
                    ? "border-2 border-[#1677ff] bg-gradient-to-b from-[#1677ff]/[0.06] to-white shadow-[0_12px_40px_-12px_rgba(22,119,255,0.35)]"
                    : "border border-[#e8eef5] bg-white/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#1677ff] px-3 py-0.5 text-xs font-medium text-white">
                    {t("popular")}
                  </span>
                )}
                <h3 className="text-lg font-bold text-[#0f172a]">{plan.name}</h3>
                <p className="mt-1 text-xs text-[#64748b]">{plan.desc}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tight text-[#0f172a]">
                    {plan.price}
                  </span>
                  <span className="text-sm text-[#64748b]">{plan.period}</span>
                </div>
                {"original" in plan && plan.original && (
                  <p className="mt-1 text-xs text-[#94a3b8] line-through">
                    {t("originalPrice", { price: plan.original })}
                  </p>
                )}
                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm leading-snug text-[#020817]"
                    >
                      <span className="mt-0.5 text-[#1677ff]">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={onClick}
                  className={`mt-8 w-full rounded-full py-2.5 text-sm font-medium transition-colors ${
                    plan.highlighted
                      ? "bg-[#1677ff] text-white hover:bg-[#4096ff] disabled:opacity-60"
                      : "border border-[#e2e8f0] text-[#020817] hover:border-[#1677ff] disabled:opacity-60"
                  }`}
                >
                  {cta}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-10 max-w-2xl text-center">
          <Link href="/" className="text-sm text-[#1677ff] hover:underline">
            {t("backHome")}
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
