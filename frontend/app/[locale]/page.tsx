import { setRequestLocale } from "next-intl/server";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HomeContent from "@/components/home/HomeContent";
import SeoNoscript from "@/components/seo/SeoNoscript";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <SeoNoscript />
      <Navbar />
      <main className="flex-1">
        <HomeContent />
      </main>
      <Footer />
    </>
  );
}
