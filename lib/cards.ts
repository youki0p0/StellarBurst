import type { Card, CardColor, DefenseEffect, SpecialEffect } from "./types";

/**
 * Deterministic PRNG (mulberry32). Used for turn-order shuffling so every
 * client derives the same order from the room seed. Card draws use a separate
 * stream on the host only, so they need not be reproduced by clients.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

let cardCounter = 0;
function nextCardId(): string {
  cardCounter += 1;
  return `c${cardCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

const COLORED: CardColor[] = ["red", "blue", "green"];

/** Pick a weighted entry from [value, weight] pairs. */
function weightedPick<T>(entries: [T, number][], rng: () => number): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [value, weight] of entries) {
    r -= weight;
    if (r <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

/** Target ratio of colorless attack cards in the attack pool (~60%). */
export const COLORLESS_ATTACK_RATIO = 0.6;

const DEFENSE_META: Record<DefenseEffect, { name: string; description: string }> = {
  block: { name: "Guard", description: "Block all damage from one attack." },
  reflect: { name: "Mirror Ward", description: "Block all damage and reflect it back at the attacker." },
};

const SPECIAL_META: Record<SpecialEffect, { name: string; description: string }> = {
  heal: { name: "Mend", description: "Restore some of your own HP." },
  shuffle_hands: { name: "Chaos Swap", description: "Shuffle and redeal every player's hand." },
  skip_turn: { name: "Stagger", description: "Chance to skip the target's next action." },
  limit_defense: { name: "Cripple", description: "Target cannot defend for 3 turns." },
  slip_damage: { name: "Venom", description: "Target takes damage over their next 3 turns." },
};

function makeAttack(rng: () => number): Card {
  const color: CardColor =
    rng() < COLORLESS_ATTACK_RATIO
      ? "colorless"
      : COLORED[Math.floor(rng() * COLORED.length)];
  const fatal = rng() < 0.08; // rare fatal cards
  const damage = 10 + Math.floor(rng() * 21); // 10..30
  const colorLabel = color === "colorless" ? "Plain" : color[0].toUpperCase() + color.slice(1);
  return {
    id: nextCardId(),
    kind: "attack",
    color,
    name: fatal ? "Fatal Strike" : `${colorLabel} Strike`,
    damage,
    fatal,
    description: fatal
      ? "A lethal blow. Any defense card may be spent to nullify it."
      : `Deal ${damage} damage.`,
  };
}

const ALL_COLORS: CardColor[] = ["colorless", "red", "blue", "green"];

function makeDefense(rng: () => number): Card {
  // Block is the common defense; reflect is the rarer, stronger one.
  const effect: DefenseEffect = rng() < 0.7 ? "block" : "reflect";
  // Colors are uniform; a colored defense only stops its color (plus colorless
  // attacks), a colorless defense only stops colorless attacks.
  const color = ALL_COLORS[Math.floor(rng() * ALL_COLORS.length)];
  const meta = DEFENSE_META[effect];
  return {
    id: nextCardId(),
    kind: "defense",
    color,
    name: meta.name,
    defense: effect,
    description: meta.description,
  };
}

function makeSpecial(rng: () => number): Card {
  const effect = weightedPick<SpecialEffect>(
    [
      ["heal", 3],
      ["shuffle_hands", 1],
      ["skip_turn", 2],
      ["limit_defense", 1],
      ["slip_damage", 2],
    ],
    rng,
  );
  const meta = SPECIAL_META[effect];
  let value: number | undefined;
  if (effect === "heal") value = 15 + Math.floor(rng() * 16); // 15..30
  if (effect === "skip_turn") value = 60; // 60% chance
  if (effect === "slip_damage") value = 8 + Math.floor(rng() * 5); // 8..12 per turn
  return {
    id: nextCardId(),
    kind: "special",
    color: "colorless",
    name: meta.name,
    special: effect,
    value,
    description: meta.description,
  };
}

/**
 * Draw a single card from the (effectively infinite) weighted deck.
 * Roughly: 50% attack, 35% defense, 15% special.
 */
export function drawCard(rng: () => number = Math.random): Card {
  const kind = weightedPick(
    [
      ["attack", 50],
      ["defense", 35],
      ["special", 15],
    ] as [string, number][],
    rng,
  );
  if (kind === "attack") return makeAttack(rng);
  if (kind === "defense") return makeDefense(rng);
  return makeSpecial(rng);
}

/** Draw `n` cards. */
export function drawCards(n: number, rng: () => number = Math.random): Card[] {
  return Array.from({ length: n }, () => drawCard(rng));
}

/** Draw a guaranteed attack card (used to keep hands from being all-defense). */
export function drawAttack(rng: () => number = Math.random): Card {
  return makeAttack(rng);
}

export const HAND_SIZE = 5;
export const MAX_HP = 100;
