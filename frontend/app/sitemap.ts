import type { MetadataRoute } from "next";
import { localePath } from "@/i18n/locales";
import { locales } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-08-06");
  const paths = ["/"] as const;

  return paths.flatMap((path) =>
    locales.map((locale) => {
      const localized = localePath(locale, path);
      return {
        url: `${SITE_URL}${localized === "/" ? "" : localized}`,
        lastModified,
        changeFrequency: "weekly" as const,
        priority: locale === "zh" ? 1 : 0.9,
      };
    })
  );
}
