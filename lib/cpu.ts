import { canDefend, canUseDefense } from "./rules";
import type { Card, GameAction, Player, RoomState } from "./types";

function alive(state: RoomState): Player[] {
  return state.players.filter((p) => p.alive && p.hp > 0);
}

/**
 * Decide a CPU player's action. Strength comes mostly from draw luck, not deep
 * AI: attack the weakest rival, heal when hurting, occasionally use a special.
 */
export function chooseCpuAction(state: RoomState, playerId: string): GameAction {
  const me = state.players.find((p) => p.id === playerId);
  const hand = state.hands[playerId] ?? [];
  if (!me) return { type: "pass" };

  const attacks = hand.filter((c) => c.kind === "attack");
  const specials = hand.filter((c) => c.kind === "special");
  const healCard = specials.find((c) => c.special === "heal");
  const opponents = alive(state).filter((p) => p.id !== playerId);

  // Heal when low and a heal is available.
  if (me.hp <= 35 && healCard) {
    return { type: "play_heal", cardId: healCard.id };
  }

  // Occasionally fire off a targeted special (~30% of the time when held).
  const targetedSpecials = specials.filter(
    (c) =>
      c.special === "skip_turn" ||
      c.special === "limit_defense" ||
      c.special === "slip_damage",
  );
  if (opponents.length > 0 && targetedSpecials.length > 0 && Math.random() < 0.3) {
    const card = pick(targetedSpecials);
    const target = weakest(opponents);
    return { type: "play_special", cardId: card.id, targetId: target.id };
  }

  // Otherwise attack the weakest opponent. Prefer fatal cards a bit.
  if (attacks.length > 0 && opponents.length > 0) {
    const fatal = attacks.find((c) => c.fatal);
    const card = fatal && Math.random() < 0.7 ? fatal : strongest(attacks);
    const target = weakest(opponents);
    return { type: "play_attack", cardId: card.id, targetId: target.id };
  }

  // Non-targeted special (e.g. shuffle) as a fallback.
  const shuffle = specials.find((c) => c.special === "shuffle_hands");
  if (shuffle && Math.random() < 0.5) {
    return { type: "play_special", cardId: shuffle.id };
  }

  // Late fallback: heal even if not low, else pass.
  if (healCard && me.hp < me.maxHp) {
    return { type: "play_heal", cardId: healCard.id };
  }
  return { type: "pass" };
}

/** Decide which defense card (if any) a CPU uses against a pending attack. */
export function chooseCpuDefense(state: RoomState, playerId: string): string | null {
  const me = state.players.find((p) => p.id === playerId);
  const hand = state.hands[playerId] ?? [];
  const attack = state.pending?.card;
  if (!me || !attack || !canUseDefense(me)) return null;

  const usable = hand.filter(
    (c) => c.kind === "defense" && (attack.fatal || canDefend(attack, c)),
  );
  if (usable.length === 0) return null;

  // Against a fatal blow, spend a plain block if possible (save reflects).
  if (attack.fatal) {
    const block = usable.find((c) => c.defense === "block") ?? usable[0];
    return block.id;
  }

  // For small hits, don't bother burning a card; otherwise prefer reflect.
  const incoming = attack.damage ?? 0;
  if (incoming <= 12 && Math.random() < 0.5) return null;
  return bestDefense(usable).id;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weakest(players: Player[]): Player {
  return players.reduce((a, b) => (b.hp < a.hp ? b : a));
}

function strongest(attacks: Card[]): Card {
  return attacks.reduce((a, b) => ((b.damage ?? 0) > (a.damage ?? 0) ? b : a));
}

function bestDefense(cards: Card[]): Card {
  const rank: Record<string, number> = {
    reflect: 2, // reflect also deals damage back, so prefer it
    block: 1,
  };
  return cards.reduce((a, b) =>
    (rank[b.defense ?? ""] ?? 0) > (rank[a.defense ?? ""] ?? 0) ? b : a,
  );
}
