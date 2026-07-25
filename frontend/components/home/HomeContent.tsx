"use client";

import { useEffect, useRef, useState } from "react";
import HeroSection from "@/components/home/HeroSection";
import UrlInputBar from "@/components/home/UrlInputBar";
import PlatformGrid from "@/components/home/PlatformGrid";

/**
 * 简洁首页：标题 + 搜索居中；连按三次 Enter 展开 Slogan 副文案。
 */
export default function HomeContent() {
  const [demoMode, setDemoMode] = useState(false);
  const enterCountRef = useRef(0);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement | null)?.isContentEditable) return;

      enterCountRef.current += 1;
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
      enterTimerRef.current = setTimeout(() => {
        enterCountRef.current = 0;
      }, 800);

      if (enterCountRef.current >= 3) {
        enterCountRef.current = 0;
        setDemoMode((v) => !v);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    };
  }, []);

  return (
    <div
      data-demo={demoMode ? "on" : "off"}
      className="flex min-h-[calc(100vh-8.5rem)] flex-col justify-center pb-8"
    >
      <HeroSection compact={!demoMode} />
      <UrlInputBar compact />
      <PlatformGrid compact />
    </div>
  );
}
