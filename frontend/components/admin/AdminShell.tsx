"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import AdminNav from "@/components/admin/AdminNav";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[#64748b]">
        加载中…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-[#0f172a]">请先登录管理员账号</p>
        <Link
          href="/login"
          className="rounded-full bg-[#1677ff] px-5 py-2 text-sm font-medium text-white"
        >
          去登录
        </Link>
      </div>
    );
  }

  if (!user.is_admin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-[#0f172a]">当前账号无后台权限</p>
        <p className="text-sm text-[#64748b]">
          将邮箱加入后端环境变量 ADMIN_EMAILS 后重新登录
        </p>
        <Link href="/" className="text-sm text-[#1677ff] hover:underline">
          返回首页
        </Link>
      </div>
    );
  }

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </>
  );
}
