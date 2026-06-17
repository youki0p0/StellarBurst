"use client";

import type { Card } from "@/lib/types";
import { AttackArt } from "./art/AttackArt";
import { DefenseArt } from "./art/DefenseArt";
import { SpecialArt } from "./art/SpecialArt";

/**
 * Dispatches to the right original pixel-art sprite for a card.
 * All artwork is hand-made dot-art (no emoji, no external assets).
 */
export function CardArt({ card, px = 48 }: { card: Card; px?: number }) {
  if (card.kind === "attack") return <AttackArt card={card} px={px} />;
  if (card.kind === "defense") return <DefenseArt card={card} px={px} />;
  return <SpecialArt card={card} px={px} />;
}
