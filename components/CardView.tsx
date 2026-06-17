"use client";

import type { Card, CardColor } from "@/lib/types";
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

const KIND_LABEL: Record<Card["kind"], string> = {
  attack: "ATK",
  defense: "DEF",
  special: "SPC",
};

export function CardView({
  card,
  onClick,
  selected,
  disabled,
  compact,
}: {
  card: Card;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  const isButton = Boolean(onClick);
  const Tag = isButton ? "button" : "div";
  return (
    <Tag
      type={isButton ? "button" : undefined}
      onClick={onClick}
      disabled={isButton ? disabled : undefined}
      className={[
        "animate-pop relative flex flex-col justify-between rounded-xl border bg-gradient-to-b to-board-900/90 p-2 text-left",
        compact ? "h-24 w-[4.5rem]" : "h-32 w-24",
        COLOR_RING[card.color],
        selected ? "shadow-neon ring-2 ring-neon-gold" : "",
        isButton && !disabled ? "hover:-translate-y-1 hover:shadow-neon" : "",
        disabled ? "opacity-40" : "",
        "transition",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-widest text-slate-300">
          {KIND_LABEL[card.kind]}
        </span>
        <span className={`h-2.5 w-2.5 rounded-full ${COLOR_DOT[card.color]}`} />
      </div>

      <div className="flex items-center justify-center">
        <CardArt card={card} px={compact ? 30 : 44} />
      </div>

      <div className="leading-tight">
        <div
          className={[
            "font-bold",
            compact ? "text-[11px]" : "text-sm",
            card.fatal ? "text-neon-pink" : "text-white",
          ].join(" ")}
        >
          {card.name}
        </div>
        {card.kind === "attack" && !card.fatal && (
          <div className="text-lg font-black text-neon-gold">{card.damage}</div>
        )}
        {card.fatal && <div className="text-[10px] font-bold text-neon-pink">FATAL</div>}
      </div>

      {!compact && (
        <p className="line-clamp-3 text-[9px] leading-snug text-slate-400">
          {card.description}
        </p>
      )}
    </Tag>
  );
}
