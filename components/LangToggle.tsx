"use client";

import { LANGS } from "@/lib/i18n";
import { useLangStore } from "@/store/i18n";

const LABEL: Record<string, string> = { ja: "日本語", en: "English" };

/** Compact JA/EN language switcher. */
export function LangToggle({ className = "" }: { className?: string }) {
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  return (
    <div
      className={`inline-flex overflow-hidden rounded-lg border border-board-600 text-xs ${className}`}
      role="group"
      aria-label="Language"
    >
      {LANGS.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={[
            "px-2.5 py-1 font-semibold transition",
            lang === l ? "bg-neon-purple text-white" : "bg-board-800 text-slate-400 hover:text-slate-200",
          ].join(" ")}
        >
          {LABEL[l]}
        </button>
      ))}
    </div>
  );
}
