import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import JsonLd from "@/components/seo/JsonLd";
import { AuthProvider } from "@/lib/auth";
import { localeMeta } from "@/i18n/locales";
import { localePath } from "@/i18n/locales";
import { locales, routing, type AppLocale } from "@/i18n/routing";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1677ff",
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (hasLocale(routing.locales, raw) ? raw : "zh") as AppLocale;
  const t = await getTranslations({ locale, namespace: "seo" });
  const meta = localeMeta[locale];
  const languages = Object.fromEntries(
    locales.map((l) => [localeMeta[l].htmlLang, localePath(l, "/")])
  );

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t("homeTitle"),
      template: `%s - ${SITE_NAME} | ${t("tagline")}`,
    },
    description: t("homeDescription"),
    keywords: t("homeKeywords")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean),
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    alternates: {
      canonical: localePath(locale, "/"),
      languages: {
        ...languages,
        "x-default": localePath("zh", "/"),
      },
    },
    openGraph: {
      type: "website",
      locale: meta.ogLocale,
      url: `${SITE_URL}${localePath(locale, "/") === "/" ? "" : localePath(locale, "/")}`,
      siteName: SITE_NAME,
      title: `${SITE_NAME} - ${t("tagline")}`,
      description: t("ogDescription"),
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} - ${t("tagline")}`,
      description: t("twitterDescription"),
    },
    other: {
      "format-detection": "telephone=no",
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale: raw } = await params;
  if (!hasLocale(routing.locales, raw)) {
    notFound();
  }
  const locale = raw as AppLocale;
  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: "seo" });
  const meta = localeMeta[locale];

  return (
    <html lang={meta.htmlLang} dir={meta.dir} suppressHydrationWarning>
      <head>
        <JsonLd />
        <meta itemProp="name" content={`${SITE_NAME} - ${t("tagline")}`} />
        <meta itemProp="description" content={t("homeDescription")} />
      </head>
      <body
        suppressHydrationWarning
        className={`${jakarta.variable} flex min-h-screen flex-col font-sans text-[#020817] antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <Suspense>{children}</Suspense>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
