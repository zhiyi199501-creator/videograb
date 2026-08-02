import { getTranslations } from "next-intl/server";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * 无 JS 时的可抓取正文：供搜索引擎 / AI 爬虫在不执行脚本时仍能读到结构化内容。
 */
export default async function SeoNoscript() {
  const t = await getTranslations("seo");

  return (
    <noscript>
      <div
        style={{
          maxWidth: 800,
          margin: "40px auto",
          padding: 20,
          fontFamily: "sans-serif",
          lineHeight: 1.8,
        }}
      >
        <h1>
          {SITE_NAME} - {t("tagline")}
        </h1>
        <p>
          <strong>
            {t("noscriptIntro", { site: SITE_NAME, url: SITE_URL })}
          </strong>
          {t("noscriptBody")}
        </p>
        <p>
          <small>{t("updatedLabel", { updatedAt: t("updatedAt") })}</small>
        </p>

        <h2>{t("noscriptHowtoTitle", { site: SITE_NAME })}</h2>
        <ol>
          <li>
            <strong>{t("noscriptStep1")}</strong>
          </li>
          <li>
            <strong>{t("noscriptStep2", { site: SITE_NAME })}</strong>
          </li>
          <li>
            <strong>{t("noscriptStep3")}</strong>
          </li>
        </ol>

        <h2>{t("noscriptFeaturesTitle", { site: SITE_NAME })}</h2>
        <ul>
          <li>
            <strong>{t("noscriptF1")}</strong>
          </li>
          <li>
            <strong>{t("noscriptF2")}</strong>
          </li>
          <li>
            <strong>{t("noscriptF3")}</strong>
          </li>
          <li>
            <strong>{t("noscriptF4")}</strong>
          </li>
          <li>
            <strong>{t("noscriptF5")}</strong>
          </li>
        </ul>

        <h2>{t("noscriptFaqTitle")}</h2>
        <h3>{t("noscriptFaqFreeQ", { site: SITE_NAME })}</h3>
        <p>{t("noscriptFaqFreeA")}</p>
        <h3>{t("noscriptFaqMobileQ")}</h3>
        <p>{t("noscriptFaqMobileA")}</p>

        <h2>{t("noscriptAboutTitle", { site: SITE_NAME })}</h2>
        <p>{t("noscriptAbout")}</p>
      </div>
    </noscript>
  );
}
