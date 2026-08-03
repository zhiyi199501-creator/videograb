"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export default function MobileTip() {
  const t = useTranslations("download");
  const [show, setShow] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isWeChat = ua.includes("micromessenger");
    const isInApp =
      ua.includes("weibo") ||
      ua.includes("qq/") ||
      ua.includes("dingtalk");
    setShow(isWeChat || isInApp);
  }, []);

  if (!show) return null;

  return (
    <div className="mb-2 rounded-xl border border-[#ffe58f] bg-[#fffbe6] px-4 py-2.5 text-sm text-[#ad6800]">
      <strong>{t("mobileTipStrong")}</strong>
      {t("mobileTip")}
    </div>
  );
}
