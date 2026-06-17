"use client";

import { useEffect } from "react";
import { useLangStore } from "@/store/i18n";

/**
 * Applies the saved/browser-detected language after hydration (so SSR and the
 * first client paint match, then we switch to the user's language). Renders
 * nothing.
 */
export function LangInit() {
  const init = useLangStore((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);
  return null;
}
