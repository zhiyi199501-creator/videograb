import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default async function PricingCancelPage() {
  const t = await getTranslations("pricing");

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-2xl font-black text-[#0f172a]">{t("cancelTitle")}</h1>
        <p className="mt-3 max-w-md text-sm text-[#64748b]">{t("cancelLead")}</p>
        <Link
          href="/pricing"
          className="mt-8 rounded-full bg-[#1677ff] px-5 py-2 text-sm font-medium text-white hover:bg-[#4096ff]"
        >
          {t("backPricing")}
        </Link>
      </main>
      <Footer />
    </>
  );
}
