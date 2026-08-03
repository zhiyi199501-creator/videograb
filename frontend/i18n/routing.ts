import { defineRouting } from "next-intl/routing";

export const locales = [
  "zh",
  "en",
  "es",
  "pt",
  "ja",
  "id",
  "hi",
  "ko",
  "de",
  "fr",
  "ru",
  "ar",
  "tr",
  "th",
  "vi",
] as const;

export type AppLocale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "zh",
  localePrefix: "as-needed",
});
