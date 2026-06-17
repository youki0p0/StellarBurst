"use client";

import type { Player } from "@/lib/types";
import { useT } from "@/store/i18n";

export function PlayerPanel({
  player,
  isCurrent,
  isSelf,
  selectable,
  selected,
  onSelect,
  handCount,
}: {
  player: Player;
  isCurrent?: boolean;
  isSelf?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  handCount?: number;
}) {
  const t = useT();
  const pct = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
  const dead = !player.alive || player.hp <= 0;

  const hpColor =
    pct > 50 ? "bg-card-green" : pct > 25 ? "bg-neon-gold" : "bg-card-red";

  const Tag = selectable && !dead ? "button" : "div";
  return (
    <Tag
      type={selectable && !dead ? "button" : undefined}
      onClick={selectable && !dead ? onSelect : undefined}
      className={[
        "panel w-full p-3 text-left transition",
        isCurrent ? "ring-2 ring-neon-purple shadow-neon" : "",
        selected ? "ring-2 ring-neon-gold" : "",
        dead ? "opacity-45 grayscale" : "",
        selectable && !dead ? "hover:border-neon-gold" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {isCurrent && <span className="animate-floaty text-neon-purple">▶</span>}
          <span className="truncate font-semibold">
            {player.name}
            {isSelf && <span className="ml-1 text-xs text-neon-cyan">({t("common.you")})</span>}
          </span>
          {player.isCPU && (
            <span className="rounded bg-board-600 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
              {t("common.cpu")}
            </span>
          )}
        </div>
        <span className="shrink-0 text-sm font-black tabular-nums">
          {Math.max(0, player.hp)}<span className="text-slate-500">/{player.maxHp}</span>
        </span>
      </div>

      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-board-900">
        <div
          className={`h-full rounded-full transition-all duration-500 ${hpColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px]">
        {typeof handCount === "number" && (
          <span className="text-slate-400">🃏 {handCount}</span>
        )}
        {player.effects.slip && (
          <span className="rounded bg-green-900/60 px-1.5 py-0.5 text-green-300">
            ☠ {player.effects.slip.turnsLeft}
          </span>
        )}
        {player.effects.defenseLimitedTurns > 0 && (
          <span className="rounded bg-red-900/60 px-1.5 py-0.5 text-red-300">
            🛡✕ {player.effects.defenseLimitedTurns}
          </span>
        )}
        {player.effects.skipNextTurn && (
          <span className="rounded bg-purple-900/60 px-1.5 py-0.5 text-purple-300">
            ⏭ skip
          </span>
        )}
        {dead && <span className="font-bold text-card-red">{t("common.defeated")}</span>}
      </div>
    </Tag>
  );
}
