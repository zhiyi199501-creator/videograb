import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Admin · VideoGrab",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${jakarta.variable} min-h-screen bg-[#f5f9fc] font-sans text-[#020817] antialiased`}
      >
        <AuthProvider>
          <AdminShell>{children}</AdminShell>
        </AuthProvider>
      </body>
    </html>
  );
}
