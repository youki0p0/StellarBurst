"use client";

import type { CSSProperties } from "react";
import type { Player } from "@/lib/types";
import { isBurst } from "@/lib/room";
import { useT } from "@/store/i18n";

export interface OrbitBoardProps {
  players: Player[];
  turnId: string | null; // whose turn (highlight + this star pulses)
  direction: 1 | -1; // orbit direction (arrow spins this way)
  selfClientId: string; // mark the local player's star with "(you)"
  selectableIds?: string[]; // ids that can be clicked (choose-target mode)
  selectedId?: string | null;
  finishingId?: string | null; // star currently being finished (STELLA target)
  onSelect?: (id: string) => void;
  flash?: { id: string; kind: "hit" | "reflect" | "heal" | "super" } | null;
}

const FLASH_STYLE: Record<NonNullable<OrbitBoardProps["flash"]>["kind"], string> = {
  hit: "ring-2 ring-card-red shadow-[0_0_18px_4px_rgba(239,68,68,0.85)]",
  reflect: "ring-2 ring-neon-cyan shadow-[0_0_18px_4px_rgba(34,211,238,0.85)]",
  heal: "ring-2 ring-card-green shadow-[0_0_18px_4px_rgba(34,197,94,0.85)]",
  super: "ring-2 ring-neon-pink shadow-[0_0_18px_4px_rgba(236,72,153,0.9)]",
};

export function OrbitBoard(props: OrbitBoardProps) {
  const {
    players,
    turnId,
    direction,
    selfClientId,
    selectableIds = [],
    selectedId = null,
    finishingId = null,
    onSelect,
    flash = null,
  } = props;

  const t = useT();
  const n = Math.max(players.length, 1);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      {/* Faint orbit ring (passes through each star's outer anchor point) */}
      <div
        className="pointer-events-none absolute rounded-full border border-board-600/60"
        style={{ left: "6%", top: "6%", width: "88%", height: "88%" }}
        aria-hidden
      />

      {/* Central sun core */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        aria-hidden
      >
        <div className="absolute h-12 w-12 rounded-full bg-neon-gold/80 shadow-neon blur-[1px]" />
        <div className="absolute h-7 w-7 rounded-full bg-neon-gold animate-floaty" />
        {/* Direction arrow */}
        <div
          className={[
            "absolute flex h-16 w-16 items-center justify-center text-neon-cyan/80 text-xl",
            "animate-[spin_6s_linear_infinite]",
            direction === -1 ? "[animation-direction:reverse] scale-x-[-1]" : "",
          ].join(" ")}
        >
          <span className="-translate-y-7 select-none">↻</span>
        </div>
      </div>

      {/* Stars evenly spaced on the orbit. Two stars sit left/right; everything
          else fans out from the top (3 → even thirds, 4 → diamond, …). Each
          token is anchored at its ring point and grows *inward* toward the core,
          so it never spills past the board edge regardless of its size. */}
      {players.map((p, i) => {
        const startDeg = n === 2 ? 180 : -90;
        const angle = (startDeg + (i * 360) / n) * (Math.PI / 180);
        const radius = 44;
        const left = 50 + radius * Math.cos(angle);
        const top = 50 + radius * Math.sin(angle);
        // Pull the token inward from its ring point along the radial direction.
        const tx = -50 - 50 * Math.cos(angle);
        const ty = -50 - 50 * Math.sin(angle);

        const isTurn = turnId !== null && p.id === turnId;
        const isSelf = p.clientId === selfClientId;
        const isSelectable = selectableIds.includes(p.id);
        const isSelected = selectedId === p.id;
        const burst = isBurst(p);
        const dead = !p.alive;
        const isFlashing = flash !== null && flash.id === p.id;

        const hpRatio = p.maxHp > 0 ? Math.max(0, Math.min(1, p.hp / p.maxHp)) : 0;

        const tokenClasses = [
          "relative flex w-[4.5rem] flex-col items-center gap-0.5 rounded-lg border px-1.5 py-1 text-center transition",
          "bg-board-800/90 backdrop-blur-sm",
          dead ? "border-board-700 opacity-40 grayscale" : "border-board-600",
          isTurn ? "ring-2 ring-neon-cyan shadow-neon animate-pulse" : "",
          isSelected ? "ring-2 ring-neon-gold" : "",
          p.id === finishingId && !dead
            ? "ring-2 ring-neon-pink shadow-[0_0_16px_3px_rgba(236,72,153,0.75)] animate-pulse"
            : "",
          burst && !dead ? "shadow-[0_0_14px_2px_rgba(250,204,21,0.6)]" : "",
          isSelectable && !isSelected ? "hover:ring-2 hover:ring-neon-gold cursor-pointer" : "",
          isFlashing ? `animate-pop ${FLASH_STYLE[flash.kind]}` : "",
        ]
          .filter(Boolean)
          .join(" ");

        // Position lives on the wrapper; the token keeps `transform` free for
        // the flash "pop" (a scale animation) so it never jumps on hit.
        const posStyle: CSSProperties = {
          left: `${left}%`,
          top: `${top}%`,
          transform: `translate(${tx}%, ${ty}%)`,
        };

        const inner = (
          <>
            {/* Star glyph */}
            <div
              className={[
                "text-lg leading-none",
                dead ? "text-board-600" : burst ? "text-neon-gold" : "text-neon-purple",
              ].join(" ")}
            >
              {dead ? "✦" : "★"}
            </div>

            {/* Name */}
            <div className="max-w-full truncate text-[0.65rem] font-semibold text-white/90">
              {p.name}
            </div>

            {/* HP text */}
            <div className="text-[0.6rem] tabular-nums text-white/70">
              {p.hp}/{p.maxHp}
            </div>

            {/* Luminosity bar */}
            <div className="h-1 w-full overflow-hidden rounded-full bg-board-900">
              <div
                className={[
                  "h-full rounded-full transition-all",
                  hpRatio > 0.5 ? "bg-card-green" : hpRatio > 0.25 ? "bg-neon-gold" : "bg-card-red",
                ].join(" ")}
                style={{ width: `${hpRatio * 100}%` }}
              />
            </div>

            {/* Tags */}
            <div className="flex flex-wrap items-center justify-center gap-0.5">
              {isSelf && (
                <span className="rounded bg-neon-cyan/20 px-1 text-[0.55rem] text-neon-cyan">
                  {t("common.you")}
                </span>
              )}
              {p.isCPU && (
                <span className="rounded bg-neon-purple/20 px-1 text-[0.55rem] text-neon-purple">
                  {t("common.cpu")}
                </span>
              )}
              {p.isHost && (
                <span className="rounded bg-neon-gold/20 px-1 text-[0.55rem] text-neon-gold">
                  {t("common.host")}
                </span>
              )}
              {!dead && p.effects.guard > 0 && (
                <span className="rounded bg-card-green/20 px-1 text-[0.55rem] text-card-green">
                  ⛨{p.effects.guard}
                </span>
              )}
            </div>

            {/* Status line */}
            {dead ? (
              <span className="text-[0.55rem] font-semibold uppercase tracking-wide text-board-600">
                {t("common.defeated")}
              </span>
            ) : burst ? (
              <span className="text-[0.55rem] font-semibold uppercase tracking-wide text-neon-gold animate-floaty">
                {t("common.burst")}
              </span>
            ) : null}
          </>
        );

        return (
          <div key={p.id} className="absolute" style={posStyle}>
            {isSelectable ? (
              <button type="button" onClick={() => onSelect?.(p.id)} className={tokenClasses}>
                {inner}
              </button>
            ) : (
              <div className={tokenClasses}>{inner}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
