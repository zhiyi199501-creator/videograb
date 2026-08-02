import { getTranslations } from "next-intl/server";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export default async function JsonLd() {
  const t = await getTranslations("seo");
  const th = await getTranslations("home");

  const webAppLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: SITE_URL,
    description: t("homeDescription"),
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "CNY",
    },
    featureList: [
      t("feature1"),
      t("feature2"),
      t("feature3"),
      t("feature4"),
      t("feature5"),
      t("feature6"),
      t("feature7"),
      t("feature8"),
      t("feature9"),
    ],
    author: {
      "@type": "Organization",
      name: SITE_NAME,
    },
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [1, 2, 3, 4, 5, 6].map((n) => ({
      "@type": "Question",
      name: t(`jsonLdFaq${n}q`),
      acceptedAnswer: {
        "@type": "Answer",
        text: t(`jsonLdFaq${n}a`),
      },
    })),
  };

  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: t("howtoName"),
    description: t("howtoDescription"),
    totalTime: "PT1M",
    tool: {
      "@type": "HowToTool",
      name: t("howtoTool"),
    },
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: th("howtoStep1Title"),
        text: th("howtoStep1Desc"),
        url: `${SITE_URL}/#how-to-use`,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: th("howtoStep2Title"),
        text: th("howtoStep2Desc"),
        url: `${SITE_URL}/#how-to-use`,
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: th("howtoStep3Title"),
        text: th("howtoStep3Desc"),
        url: `${SITE_URL}/#how-to-use`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
      />
    </>
  );
}
