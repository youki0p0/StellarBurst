import { attackTargetId } from "./room";
import { canDefend, canUseDefense } from "./rules";
import type { GameAction, Player, RoomState } from "./types";

function alive(state: RoomState): Player[] {
  return state.players.filter((p) => p.alive && p.hp > 0);
}

/**
 * Decide a CPU player's action. Strength comes mostly from draw luck, not deep
 * AI. Targets are flow-based (the reducer resolves next/prev/random/all), so
 * the CPU only picks a target for rare free-pick ("choose") flares.
 */
export function chooseCpuAction(state: RoomState, playerId: string): GameAction {
  const me = state.players.find((p) => p.id === playerId);
  const hand = state.hands[playerId] ?? [];
  if (!me) return { type: "pass" };

  const attacks = hand.filter((c) => c.kind === "attack");
  const specials = hand.filter((c) => c.kind === "special");
  const healCard = specials.find((c) => c.special === "heal");
  const opponents = alive(state).filter((p) => p.id !== playerId);

  // Rekindle when dim.
  if (me.hp <= 35 && healCard) return { type: "play_heal", cardId: healCard.id };

  // Occasionally throw a flow special for chaos.
  const flowSpecials = specials.filter((c) => c.special !== "heal");
  if (flowSpecials.length > 0 && Math.random() < 0.35) {
    return { type: "play_special", cardId: pick(flowSpecials).id };
  }

  // Otherwise flare. Prefer a fatal sometimes; only "choose" needs a target.
  if (attacks.length > 0 && opponents.length > 0) {
    const fatal = attacks.find((c) => c.fatal);
    const card = fatal && Math.random() < 0.6 ? fatal : pick(attacks);
    const chosen = card.attackTarget === "choose" ? weakest(opponents).id : undefined;
    // Declare a STELLA finish when the resolved target would actually darken
    // (the bot "calls its shot"), but not every time.
    let stella = false;
    if (card.attackTarget !== "all") {
      const tid = attackTargetId(state, playerId, card, chosen);
      const tgt = tid ? state.players.find((p) => p.id === tid) : null;
      const lethal = card.fatal === true || (tgt ? (card.damage ?? 0) >= tgt.hp : false);
      stella = lethal && Math.random() < 0.6;
    }
    return { type: "play_attack", cardId: card.id, targetId: chosen, stella };
  }

  if (specials.length > 0) return { type: "play_special", cardId: pick(specials).id };
  if (healCard && me.hp < me.maxHp) return { type: "play_heal", cardId: healCard.id };
  return { type: "pass" };
}

/** Decide which defense card (if any) a CPU uses against a pending flare. */
export function chooseCpuDefense(state: RoomState, playerId: string): string | null {
  const me = state.players.find((p) => p.id === playerId);
  const hand = state.hands[playerId] ?? [];
  const attack = state.pending?.card;
  if (!me || !attack || !canUseDefense(me)) return null;

  const colorOk = (c: { defense?: string; color?: string }) =>
    attack.fatal || canDefend(attack, c as never);
  const defs = hand.filter((c) => c.kind === "defense");
  const blocks = defs.filter((c) => c.defense === "block" && colorOk(c));
  const reflects = defs.filter((c) => c.defense === "reflect" && colorOk(c));
  const passes = defs.filter((c) => c.defense === "pass");

  // Supernova (fatal): survive somehow — block, or shove it on, or reflect.
  if (attack.fatal) {
    return (blocks[0] ?? passes[0] ?? reflects[0])?.id ?? null;
  }

  const incoming = attack.damage ?? 0;
  if (incoming <= 10 && Math.random() < 0.5) return null; // shrug off a glancing flare

  if (reflects.length && Math.random() < 0.6) return reflects[0].id; // bounce it back
  if (passes.length && Math.random() < 0.5) return passes[0].id; // shove it onward
  if (blocks.length) return blocks[0].id;
  if (reflects.length) return reflects[0].id;
  if (passes.length) return passes[0].id;
  return null;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weakest(players: Player[]): Player {
  return players.reduce((a, b) => (b.hp < a.hp ? b : a));
}
