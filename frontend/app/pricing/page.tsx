import type { Metadata } from "next";
import PricingContent from "@/components/pricing/PricingContent";
import {
  PRICING_DESCRIPTION,
  PRICING_KEYWORDS,
  PRICING_TITLE,
  SITE_URL,
} from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: PRICING_TITLE },
  description: PRICING_DESCRIPTION,
  keywords: PRICING_KEYWORDS,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: PRICING_TITLE,
    description: PRICING_DESCRIPTION,
    url: `${SITE_URL}/pricing`,
    type: "website",
  },
};

export default function PricingPage() {
  return <PricingContent />;
}
