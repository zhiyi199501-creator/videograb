import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function PricingCancelPage() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-2xl font-black text-[#0f172a]">已取消支付</h1>
        <p className="mt-3 max-w-md text-sm text-[#64748b]">
          未完成付款，你可以随时回到定价页重新升级 Pro。
        </p>
        <Link
          href="/pricing"
          className="mt-8 rounded-full bg-[#1677ff] px-5 py-2 text-sm font-medium text-white hover:bg-[#4096ff]"
        >
          返回定价
        </Link>
      </main>
      <Footer />
    </>
  );
}
