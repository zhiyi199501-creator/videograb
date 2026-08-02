"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/lib/auth";

export default function PricingSuccessPage() {
  const t = useTranslations("pricing");
  const { refreshMe, user, loading } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshMe().catch(() => undefined);
    }, 800);
    return () => clearTimeout(timer);
  }, [refreshMe]);

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-2xl font-black text-[#0f172a]">{t("successTitle")}</h1>
        <p className="mt-3 max-w-md text-sm text-[#64748b]">
          {loading
            ? t("successConfirming")
            : user?.is_pro
              ? t("successActive")
              : t("successPending")}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => refreshMe()}
            className="rounded-full border border-[#e2e8f0] px-5 py-2 text-sm hover:border-[#1677ff]"
          >
            {t("refreshStatus")}
          </button>
          <Link
            href="/"
            className="rounded-full bg-[#1677ff] px-5 py-2 text-sm font-medium text-white hover:bg-[#4096ff]"
          >
            {t("startUsing")}
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
