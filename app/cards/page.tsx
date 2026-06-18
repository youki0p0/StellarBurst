"use client";

import Link from "next/link";
import { LangToggle } from "@/components/LangToggle";
import { CardView } from "@/components/CardView";
import { useT } from "@/store/i18n";
import type { Card, CardColor } from "@/lib/types";

let n = 0;
function mk(c: Omit<Card, "id" | "name" | "description">): Card {
  n += 1;
  return { id: `cat${n}`, name: "", description: "", ...c };
}

const ATTACKS: Card[] = [
  mk({ kind: "attack", color: "colorless", damage: 18, attackTarget: "next" }),
  mk({ kind: "attack", color: "red", damage: 18, attackTarget: "next" }),
  mk({ kind: "attack", color: "blue", damage: 18, attackTarget: "next" }),
  mk({ kind: "attack", color: "green", damage: 18, attackTarget: "next" }),
  mk({ kind: "attack", color: "colorless", damage: 16, attackTarget: "random" }),
  mk({ kind: "attack", color: "colorless", damage: 7, attackTarget: "all" }),
  mk({ kind: "attack", color: "colorless", damage: 16, attackTarget: "next", chain: true }),
  mk({ kind: "attack", color: "red", damage: 30, attackTarget: "next", fatal: true }),
];

const DEFENSES: Card[] = [
  mk({ kind: "defense", color: "colorless", defense: "block" }),
  mk({ kind: "defense", color: "colorless", defense: "reflect" }),
  mk({ kind: "defense", color: "colorless", defense: "pass" }),
];

const DEFENSE_COLORS: Card[] = (
  ["colorless", "red", "blue", "green"] as CardColor[]
).map((color) => mk({ kind: "defense", color, defense: "block" }));

const SPECIALS: Card[] = [
  mk({ kind: "special", color: "colorless", special: "heal", value: 20 }),
  mk({ kind: "special", color: "colorless", special: "reverse" }),
  mk({ kind: "special", color: "colorless", special: "skip_turn", value: 60 }),
  mk({ kind: "special", color: "colorless", special: "shuffle_hands" }),
  mk({ kind: "special", color: "colorless", special: "slip_damage", value: 10 }),
];

/** Compact debug metadata line for a card. */
function meta(card: Card): string {
  const bits: string[] = [card.kind, card.color];
  if (card.attackTarget) bits.push(`→${card.attackTarget}`);
  if (card.chain) bits.push("chain");
  if (card.damage != null) bits.push(`dmg ${card.damage}`);
  if (card.fatal) bits.push("fatal");
  if (card.defense) bits.push(card.defense);
  if (card.special) bits.push(card.special);
  if (card.value != null) bits.push(`val ${card.value}`);
  return bits.join(" · ");
}

function Section({ title, cards }: { title: string; cards: Card[] }) {
  return (
    <section className="panel p-4">
      <h2 className="mb-3 font-bold text-neon-purple">{title}</h2>
      <div className="flex flex-wrap gap-3">
        {cards.map((card) => (
          <div key={card.id} className="flex flex-col items-center gap-1">
            <CardView card={card} />
            <span className="max-w-24 text-center text-[9px] leading-tight text-slate-500">
              {meta(card)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function CardCatalogPage() {
  const t = useT();
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-neon-cyan hover:underline">
          {t("cards.back")}
        </Link>
        <LangToggle />
      </div>

      <header className="text-center">
        <h1 className="text-3xl font-black text-neon-gold">{t("cards.title")}</h1>
        <p className="mt-1 text-sm text-slate-400">{t("cards.subtitle")}</p>
      </header>

      <Section title={t("cards.attacks")} cards={ATTACKS} />
      <Section title={t("cards.defenses")} cards={DEFENSES} />
      <Section title={t("cards.defenseColors")} cards={DEFENSE_COLORS} />
      <Section title={t("cards.specials")} cards={SPECIALS} />
    </div>
  );
}
