import { redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { localePath } from "@/i18n/locales";
import { routing, type AppLocale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

/** Pro 自助升级入口已下线。 */
export default async function PricingCancelPage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = (hasLocale(routing.locales, raw) ? raw : "zh") as AppLocale;
  setRequestLocale(locale);
  redirect(localePath(locale, "/"));
}
