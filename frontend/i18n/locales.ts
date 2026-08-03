import type { AppLocale } from "./routing";

export const localeMeta: Record<
  AppLocale,
  { label: string; nativeLabel: string; htmlLang: string; ogLocale: string; dir: "ltr" | "rtl" }
> = {
  zh: {
    label: "Chinese",
    nativeLabel: "简体中文",
    htmlLang: "zh-CN",
    ogLocale: "zh_CN",
    dir: "ltr",
  },
  en: {
    label: "English",
    nativeLabel: "English",
    htmlLang: "en",
    ogLocale: "en_US",
    dir: "ltr",
  },
  es: {
    label: "Spanish",
    nativeLabel: "Español",
    htmlLang: "es",
    ogLocale: "es_ES",
    dir: "ltr",
  },
  pt: {
    label: "Portuguese",
    nativeLabel: "Português",
    htmlLang: "pt",
    ogLocale: "pt_BR",
    dir: "ltr",
  },
  ja: {
    label: "Japanese",
    nativeLabel: "日本語",
    htmlLang: "ja",
    ogLocale: "ja_JP",
    dir: "ltr",
  },
  id: {
    label: "Indonesian",
    nativeLabel: "Bahasa Indonesia",
    htmlLang: "id",
    ogLocale: "id_ID",
    dir: "ltr",
  },
  hi: {
    label: "Hindi",
    nativeLabel: "हिन्दी",
    htmlLang: "hi",
    ogLocale: "hi_IN",
    dir: "ltr",
  },
  ko: {
    label: "Korean",
    nativeLabel: "한국어",
    htmlLang: "ko",
    ogLocale: "ko_KR",
    dir: "ltr",
  },
  de: {
    label: "German",
    nativeLabel: "Deutsch",
    htmlLang: "de",
    ogLocale: "de_DE",
    dir: "ltr",
  },
  fr: {
    label: "French",
    nativeLabel: "Français",
    htmlLang: "fr",
    ogLocale: "fr_FR",
    dir: "ltr",
  },
  ru: {
    label: "Russian",
    nativeLabel: "Русский",
    htmlLang: "ru",
    ogLocale: "ru_RU",
    dir: "ltr",
  },
  ar: {
    label: "Arabic",
    nativeLabel: "العربية",
    htmlLang: "ar",
    ogLocale: "ar_AR",
    dir: "rtl",
  },
  tr: {
    label: "Turkish",
    nativeLabel: "Türkçe",
    htmlLang: "tr",
    ogLocale: "tr_TR",
    dir: "ltr",
  },
  th: {
    label: "Thai",
    nativeLabel: "ไทย",
    htmlLang: "th",
    ogLocale: "th_TH",
    dir: "ltr",
  },
  vi: {
    label: "Vietnamese",
    nativeLabel: "Tiếng Việt",
    htmlLang: "vi",
    ogLocale: "vi_VN",
    dir: "ltr",
  },
};

export function localePath(locale: string, path: string = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (locale === "zh") {
    return normalized === "/" ? "/" : normalized;
  }
  if (normalized === "/") return `/${locale}`;
  return `/${locale}${normalized}`;
}
