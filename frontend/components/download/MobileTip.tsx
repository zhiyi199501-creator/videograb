"use client";

import { useEffect, useState } from "react";

export default function MobileTip() {
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
    <div className="mb-4 rounded-xl border border-[#ffe58f] bg-[#fffbe6] px-4 py-3 text-sm text-[#ad6800]">
      <strong>提示：</strong>
      当前为应用内置浏览器，下载可能受限。请点击右上角「···」选择
      「在 Safari / Chrome 中打开」以获得最佳下载体验。
    </div>
  );
}
