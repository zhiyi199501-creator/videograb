import { redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { localePath } from "@/i18n/locales";
import { routing, type AppLocale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

/** Pro 注册入口已下线：定价页统一回首页。 */
export default async function PricingPage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = (hasLocale(routing.locales, raw) ? raw : "zh") as AppLocale;
  setRequestLocale(locale);
  redirect(localePath(locale, "/"));
}
