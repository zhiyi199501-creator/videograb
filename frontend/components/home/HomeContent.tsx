"use client";

import { useEffect, useRef, useState } from "react";
import HeroSection from "@/components/home/HeroSection";
import UrlInputBar from "@/components/home/UrlInputBar";
import PlatformGrid from "@/components/home/PlatformGrid";
import HowToSection from "@/components/home/HowToSection";
import ComparisonSection from "@/components/home/ComparisonSection";
import FaqSection from "@/components/home/FaqSection";
import { useAiSummaryApp } from "@/lib/useAiSummaryApp";

/**
 * 简洁首页：标题 + 搜索居中；连按三次 Enter 展开 Slogan 副文案。
 * iOS AI 精简壳：只保留输入与平台标签，隐藏下载向 GEO 长文。
 */
export default function HomeContent() {
  const [demoMode, setDemoMode] = useState(false);
  const aiFirst = useAiSummaryApp();
  const enterCountRef = useRef(0);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (aiFirst) return;
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
  }, [aiFirst]);

  return (
    <>
      <div
        data-demo={demoMode ? "on" : "off"}
        data-ai-first={aiFirst ? "on" : "off"}
        className={
          aiFirst
            ? "flex min-h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px))] flex-col justify-center gap-8 pb-10 pt-4"
            : "flex min-h-[calc(100vh-8.5rem)] flex-col justify-center pb-8"
        }
      >
        <HeroSection compact={!demoMode && !aiFirst} />
        <UrlInputBar compact={!aiFirst} />
        <PlatformGrid compact={!aiFirst} />
      </div>
      {!aiFirst && (
        <>
          <HowToSection />
          <ComparisonSection />
          <FaqSection />
        </>
      )}
    </>
  );
}
