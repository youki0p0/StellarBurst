import type { Card, Player } from "./types";

/**
 * Whether `defense` is a legal response to `attack` based on color rules:
 * - Colorless attack: any defense color works.
 * - Colored attack: ONLY the same color defends it (a colorless defense does
 *   not work against a colored attack).
 */
export function canDefend(attack: Card, defense: Card): boolean {
  if (defense.kind !== "defense") return false;
  if (attack.color === "colorless") return true;
  return defense.color === attack.color;
}

export interface AttackResolution {
  /** Damage dealt to the target. */
  damageToTarget: number;
  /** Damage reflected back to the attacker. */
  damageToAttacker: number;
  /** True when the (fatal) attack was fully negated. */
  nullified: boolean;
  /** True when the defense card was consumed. */
  defenseConsumed: boolean;
}

/**
 * Resolve an attack against an optional chosen defense card.
 *
 * - Defense cards fully cut damage: `block` → take 0; `reflect` → take 0 and
 *   the attacker takes the full damage instead.
 * - Color rules (see `canDefend`) gate normal attacks: a colored attack needs
 *   the same-colored defense; a colorless attack accepts any color.
 * - Fatal attacks are lethal, but as a safety valve ANY defense card (any
 *   color) negates one — so there is no unavoidable instant death.
 */
export function resolveAttack(
  attack: Card,
  defense: Card | null,
  targetHp: number,
): AttackResolution {
  const base = attack.damage ?? 0;

  if (attack.fatal) {
    if (defense) {
      // Any defense card cancels a fatal blow (color-independent safety valve).
      return { damageToTarget: 0, damageToAttacker: 0, nullified: true, defenseConsumed: true };
    }
    return { damageToTarget: targetHp, damageToAttacker: 0, nullified: false, defenseConsumed: false };
  }

  if (!defense || !canDefend(attack, defense)) {
    // No defense, or wrong color → full damage through.
    return {
      damageToTarget: base,
      damageToAttacker: 0,
      nullified: false,
      defenseConsumed: defense ? true : false,
    };
  }

  if (defense.defense === "reflect") {
    // Fully cut and bounce the full damage back at the attacker.
    return { damageToTarget: 0, damageToAttacker: base, nullified: false, defenseConsumed: true };
  }
  // block: fully cut all incoming damage.
  return { damageToTarget: 0, damageToAttacker: 0, nullified: false, defenseConsumed: true };
}

/** Clamp HP into the valid range. */
export function applyDamage(hp: number, amount: number): number {
  return Math.max(0, Math.min(100, hp - amount));
}

export function applyHeal(hp: number, maxHp: number, amount: number): number {
  return Math.max(0, Math.min(maxHp, hp + amount));
}

/** Players still in the game (alive). */
export function alivePlayers(players: Player[]): Player[] {
  return players.filter((p) => p.alive && p.hp > 0);
}

/** Returns the winner id if exactly one player remains, else null. */
export function findWinner(players: Player[]): string | null {
  const alive = alivePlayers(players);
  return alive.length === 1 ? alive[0].id : null;
}

/** Whether a player may currently play a defense card (effect gate). */
export function canUseDefense(player: Player): boolean {
  return player.effects.defenseLimitedTurns <= 0;
}
