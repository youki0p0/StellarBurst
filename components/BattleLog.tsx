"use client";

import { useEffect, useRef } from "react";
import type { GameEvent } from "@/lib/types";
import { useLangStore, useT } from "@/store/i18n";
import { localizeCardNameKey } from "@/lib/i18n";

const ICON: Record<GameEvent["type"], string> = {
  info: "•",
  attack: "⚔",
  defend: "🛡",
  reflect: "↩",
  heal: "✚",
  special: "✦",
  slip: "☠",
  skip: "⏭",
  eliminate: "💀",
  win: "👑",
};

export function BattleLog({ log }: { log: GameEvent[] }) {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log.length]);

  function render(e: GameEvent): string {
    const params = { ...(e.params ?? {}) };
    // Card names are stored as i18n keys; localize before interpolation.
    if (typeof params.card === "string" && params.card.startsWith("cardname.")) {
      params.card = localizeCardNameKey(params.card, lang);
    }
    return t(e.key, params);
  }

  return (
    <div className="panel flex h-40 flex-col p-2">
      <div className="mb-1 px-1 text-xs font-bold uppercase tracking-widest text-slate-400">
        {t("log.title")}
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-1 text-sm">
        {log.length === 0 && <p className="text-slate-500">{t("log.waiting")}</p>}
        {log.map((e) => (
          <p key={e.id} className="leading-snug">
            <span className="mr-1.5">{ICON[e.type]}</span>
            <span className={e.type === "win" ? "font-bold text-neon-gold" : ""}>
              {render(e)}
            </span>
          </p>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
