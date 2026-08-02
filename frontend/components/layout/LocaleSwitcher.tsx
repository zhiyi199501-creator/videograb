"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { localeMeta } from "@/i18n/locales";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, type AppLocale } from "@/i18n/routing";

export default function LocaleSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <label className="inline-flex items-center gap-1.5 text-sm text-[#64748b]">
      <span className="sr-only">{t("language")}</span>
      <select
        value={locale}
        disabled={pending}
        aria-label={t("language")}
        onChange={(e) => {
          const next = e.target.value as AppLocale;
          startTransition(() => {
            router.replace(pathname, { locale: next });
          });
        }}
        className="max-w-[9.5rem] cursor-pointer rounded-full border border-[#e2e8f0] bg-white px-2.5 py-1.5 text-xs text-[#020817] outline-none hover:border-[#1677ff] focus:border-[#1677ff] disabled:opacity-60"
      >
        {locales.map((code) => (
          <option key={code} value={code}>
            {localeMeta[code].nativeLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
