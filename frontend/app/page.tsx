import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HomeContent from "@/components/home/HomeContent";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <HomeContent />
      </main>
      <Footer />
    </>
  );
}
