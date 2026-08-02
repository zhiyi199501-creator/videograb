import type { MetadataRoute } from "next";
import { localePath } from "@/i18n/locales";
import { locales } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-07-28");
  const paths = ["/", "/pricing"] as const;

  return paths.flatMap((path, index) =>
    locales.map((locale) => {
      const localized = localePath(locale, path);
      return {
        url: `${SITE_URL}${localized === "/" ? "" : localized}`,
        lastModified,
        changeFrequency: path === "/" ? ("weekly" as const) : ("monthly" as const),
        priority: path === "/" ? (locale === "zh" ? 1 : 0.9) : 0.8,
        // Keep deterministic order: home zh first
        ...(index === 0 && locale === "zh" ? {} : {}),
      };
    })
  );
}
