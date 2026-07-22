import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import UrlInputBar from "@/components/home/UrlInputBar";
import PlatformGrid from "@/components/home/PlatformGrid";
import ProFeatureCards from "@/components/home/ProFeatureCards";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <UrlInputBar />
        <PlatformGrid />
        <ProFeatureCards />
      </main>
      <Footer />
    </>
  );
}
