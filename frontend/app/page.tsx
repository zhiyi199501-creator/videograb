import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HomeContent from "@/components/home/HomeContent";
import SeoNoscript from "@/components/seo/SeoNoscript";

export default function Home() {
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
