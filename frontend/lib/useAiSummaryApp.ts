"use client";

import { useEffect, useState } from "react";
import { isAiSummaryApp } from "@/lib/nativeApp";

/** Client-only; false on SSR / first paint to avoid hydration mismatch. */
export function useAiSummaryApp(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(isAiSummaryApp());
  }, []);
  return on;
}
