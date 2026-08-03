import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PricingContent from "@/components/pricing/PricingContent";
import { localeMeta, localePath } from "@/i18n/locales";
import { locales, routing, type AppLocale } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (hasLocale(routing.locales, raw) ? raw : "zh") as AppLocale;
  const t = await getTranslations({ locale, namespace: "seo" });
  const meta = localeMeta[locale];
  const path = localePath(locale, "/pricing");
  const languages = Object.fromEntries(
    locales.map((l) => [localeMeta[l].htmlLang, localePath(l, "/pricing")])
  );

  return {
    title: { absolute: t("pricingTitle") },
    description: t("pricingDescription"),
    keywords: t("pricingKeywords")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean),
    alternates: {
      canonical: path,
      languages: {
        ...languages,
        "x-default": localePath("zh", "/pricing"),
      },
    },
    openGraph: {
      title: t("pricingTitle"),
      description: t("pricingDescription"),
      url: `${SITE_URL}${path}`,
      type: "website",
      locale: meta.ogLocale,
    },
  };
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PricingContent />;
}
