import type {
  AttackTarget,
  Card,
  CardColor,
  DefenseEffect,
  SpecialEffect,
} from "./types";

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
  pass: { name: "Pass", description: "Shove the incoming attack onto the next player." },
};

const SPECIAL_META: Record<SpecialEffect, { name: string; description: string }> = {
  heal: { name: "Mend", description: "Restore some of your own HP." },
  shuffle_hands: { name: "Chaos Swap", description: "Shuffle and redeal every player's hand." },
  skip_turn: { name: "Skip", description: "Skip the next player's turn." },
  reverse: { name: "Reverse", description: "Reverse the turn order." },
  slip_damage: { name: "Venom", description: "The next player takes damage over 3 turns." },
};

function makeAttack(rng: () => number): Card {
  const color: CardColor =
    rng() < COLORLESS_ATTACK_RATIO
      ? "colorless"
      : COLORED[Math.floor(rng() * COLORED.length)];
  // Flow-based targeting: attacks almost always follow the orbit ("next") so
  // turn order stays readable. prev / random are rare spice; AOE stays modest.
  // (Free-pick "choose" is retired from the deck.)
  const target = weightedPick<AttackTarget>(
    [
      ["next", 82],
      ["prev", 4],
      ["random", 4],
      ["all", 10],
    ],
    rng,
  );
  const isAoe = target === "all";
  const chain = target === "next" && rng() < 0.2;
  const fatal = !isAoe && !chain && rng() < 0.05; // rare, never on AOE/chain
  // Round, readable damage values (multiples of 10) so players can do the math
  // at a glance. Single-target flares 10/20/30 (avg ~18); chains a touch softer
  // (10/20) since they can hit several stars; AOE a flat 10.
  const damage = isAoe
    ? 10
    : chain
      ? weightedPick<number>([[10, 6], [20, 4]], rng)
      : weightedPick<number>([[10, 4], [20, 4], [30, 2]], rng);
  return {
    id: nextCardId(),
    kind: "attack",
    color,
    name: "",
    description: "",
    damage,
    fatal,
    attackTarget: target,
    chain: chain || undefined,
  };
}

const ALL_COLORS: CardColor[] = ["colorless", "red", "blue", "green"];

function makeDefense(rng: () => number): Card {
  // block: cut all · reflect: cut + bounce back · pass: shove onto next player.
  const effect = weightedPick<DefenseEffect>(
    [
      ["block", 5],
      ["reflect", 3],
      ["pass", 3],
    ],
    rng,
  );
  // Pass works regardless of color (it forwards, not blocks), so it's colorless.
  // Colored defenses stop their color (+ colorless attacks); colorless stops
  // only colorless attacks.
  const color: CardColor =
    effect === "pass" ? "colorless" : ALL_COLORS[Math.floor(rng() * ALL_COLORS.length)];
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
  // Flow-disrupting cards are emphasised over raw stats.
  const effect = weightedPick<SpecialEffect>(
    [
      ["reverse", 3],
      ["skip_turn", 3],
      ["heal", 3],
      ["shuffle_hands", 2],
      ["slip_damage", 2],
    ],
    rng,
  );
  const meta = SPECIAL_META[effect];
  let value: number | undefined;
  if (effect === "heal") value = weightedPick<number>([[20, 3], [30, 2]], rng); // round
  if (effect === "skip_turn") value = 60; // 60% chance
  if (effect === "slip_damage") value = 10; // round, per turn
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
