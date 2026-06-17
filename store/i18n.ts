"use client";

import { create } from "zustand";
import { detectLang, t as translate, type Lang } from "@/lib/i18n";

interface LangStore {
  lang: Lang;
  /** True once the client has applied the saved/detected language. */
  ready: boolean;
  setLang: (lang: Lang) => void;
  /** Apply saved choice or browser detection (client-only, post-hydration). */
  init: () => void;
}

export const useLangStore = create<LangStore>((set) => ({
  // Deterministic default for SSR + first paint to avoid hydration mismatch.
  lang: "ja",
  ready: false,
  setLang: (lang) => {
    if (typeof window !== "undefined") localStorage.setItem("sb_lang", lang);
    set({ lang, ready: true });
  },
  init: () => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("sb_lang");
    const lang: Lang = saved === "ja" || saved === "en" ? saved : detectLang();
    set({ lang, ready: true });
  },
}));

/** Hook returning a translate function bound to the current language. */
export function useT() {
  const lang = useLangStore((s) => s.lang);
  return (key: string, params?: Record<string, string | number>) =>
    translate(key, lang, params);
}
