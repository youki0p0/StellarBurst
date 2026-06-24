"use client";

import type { AttackTarget, Card, CardColor } from "@/lib/types";
import { localizeCardName } from "@/lib/i18n";
import { useLangStore, useT } from "@/store/i18n";
import { CardArt } from "./CardArt";

const COLOR_RING: Record<CardColor, string> = {
  colorless: "border-card-colorless/70 from-slate-600/40",
  red: "border-card-red/70 from-red-600/30",
  blue: "border-card-blue/70 from-blue-600/30",
  green: "border-card-green/70 from-green-600/30",
};

const COLOR_DOT: Record<CardColor, string> = {
  colorless: "bg-card-colorless",
  red: "bg-card-red",
  blue: "bg-card-blue",
  green: "bg-card-green",
};

/**
 * Badge describing where an attack lands. "choose" (pick a target freely) is
 * styled to stand out; next/prev arrows follow the current orbit direction so
 * they flip when someone plays Retrograde.
 */
function targetMeta(
  target: AttackTarget,
  dir: 1 | -1,
): { glyph: string; key: string; cls: string } {
  const cw = dir === 1;
  switch (target) {
    case "choose":
      return { glyph: "◎", key: "target.choose", cls: "bg-neon-pink/25 text-neon-pink ring-1 ring-neon-pink" };
    case "all":
      return { glyph: "✸", key: "target.all", cls: "bg-neon-purple/25 text-neon-purple" };
    case "random":
      return { glyph: "⇄", key: "target.random", cls: "bg-board-700 text-slate-200" };
    case "prev":
      return { glyph: cw ? "◀" : "▶", key: "target.prev", cls: "bg-board-700 text-slate-200" };
    case "next":
    default:
      return { glyph: cw ? "▶" : "◀", key: "target.next", cls: "bg-board-700 text-slate-200" };
  }
}

export function CardView({
  card,
  onClick,
  selected,
  disabled,
  compact,
  direction = 1,
}: {
  card: Card;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  compact?: boolean;
  /** Current orbit direction, so next/prev target arrows point the right way. */
  direction?: 1 | -1;
}) {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const isButton = Boolean(onClick);
  const Tag = isButton ? "button" : "div";

  const isAttack = card.kind === "attack";
  const tgt = isAttack ? targetMeta(card.attackTarget ?? "next", direction) : null;
  const isChoose = isAttack && card.attackTarget === "choose";

  return (
    <Tag
      type={isButton ? "button" : undefined}
      onClick={onClick}
      disabled={isButton ? disabled : undefined}
      className={[
        "animate-pop relative flex flex-col justify-between rounded-xl border bg-gradient-to-b to-board-900/90 p-2 text-left",
        compact ? "h-24 w-[4.5rem]" : "h-32 w-24",
        COLOR_RING[card.color],
        // Make a free-pick "choose" flare unmistakable at a glance.
        isChoose ? "ring-2 ring-neon-pink/80 shadow-[0_0_12px_1px_rgba(236,72,153,0.55)]" : "",
        selected ? "shadow-neon ring-2 ring-neon-gold" : "",
        isButton && !disabled ? "hover:-translate-y-1 hover:shadow-neon" : "",
        disabled ? "opacity-40" : "",
        "transition",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex min-w-0 items-center gap-1">
          <span className="text-[10px] font-bold tracking-widest text-slate-300">
            {t(`kind.${card.kind}`)}
          </span>
          {tgt && (
            <span
              className={`flex items-center gap-0.5 whitespace-nowrap rounded px-1 text-[9px] font-bold leading-none ${tgt.cls}`}
            >
              <span className="leading-none">{tgt.glyph}</span>
              {!compact && <span>{t(tgt.key)}</span>}
            </span>
          )}
        </div>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLOR_DOT[card.color]}`} />
      </div>

      <div className="flex items-center justify-center">
        <CardArt card={card} px={compact ? 28 : 40} />
      </div>

      <div className="leading-tight">
        <div
          className={[
            "truncate font-bold",
            compact ? "text-[11px]" : "text-sm",
            card.fatal ? "text-neon-pink" : "text-white",
          ].join(" ")}
        >
          {localizeCardName(card, lang)}
        </div>
        {isAttack && !card.fatal && (
          <div className="flex items-baseline gap-1">
            <span className={`font-black tabular-nums text-neon-gold ${compact ? "text-xl" : "text-3xl"}`}>
              {card.damage}
            </span>
            <span className={`font-bold text-neon-gold/70 ${compact ? "text-[8px]" : "text-[9px]"}`}>
              {t("card.dmg")}
            </span>
          </div>
        )}
        {card.fatal && (
          <div className={`font-black text-neon-pink ${compact ? "text-[11px]" : "text-sm"}`}>
            {t("fx.fatal")}
          </div>
        )}
        {!isAttack && (
          <div className={`font-bold leading-tight text-neon-cyan ${compact ? "text-[10px]" : "text-xs"}`}>
            {effectLabel(card, t)}
          </div>
        )}
      </div>
    </Tag>
  );
}

/** Plain-language effect for a defense/special card (incl. its magnitude). */
function effectLabel(card: Card, t: (k: string) => string): string {
  if (card.kind === "defense") return t(`fx.${card.defense}`);
  if (card.kind === "special") {
    if (card.special === "heal") return `${t("fx.heal")} +${card.value ?? 20}`;
    if (card.special === "slip_damage") return `${t("fx.slip_damage")} ${card.value ?? 10}×3`;
    return t(`fx.${card.special}`);
  }
  return "";
}
