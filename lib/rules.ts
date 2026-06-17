import type { Card, Player } from "./types";

/**
 * Whether `defense` is a legal response to `attack` based on color rules:
 * - Colorless attack: any defense color works.
 * - Colored attack: matching color OR a colorless (wildcard) defense.
 */
export function canDefend(attack: Card, defense: Card): boolean {
  if (defense.kind !== "defense") return false;
  if (attack.color === "colorless") return true;
  return defense.color === "colorless" || defense.color === attack.color;
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
 * Fatal rules: a fatal attack is lethal, but ANY defense card may be spent to
 * negate it entirely (no unavoidable instant death).
 *
 * Non-fatal: a valid defense reduces / reflects damage; an invalid or absent
 * defense lets full damage through.
 */
export function resolveAttack(
  attack: Card,
  defense: Card | null,
  targetHp: number,
): AttackResolution {
  const base = attack.damage ?? 0;

  if (attack.fatal) {
    if (defense) {
      // Any defense card nullifies a fatal attack.
      return {
        damageToTarget: 0,
        damageToAttacker: 0,
        nullified: true,
        defenseConsumed: true,
      };
    }
    // Unblocked fatal: reduce target to 0 (still not "instant death" — they had
    // the option to defend if holding any defense card).
    return {
      damageToTarget: targetHp,
      damageToAttacker: 0,
      nullified: false,
      defenseConsumed: false,
    };
  }

  if (!defense || !canDefend(attack, defense)) {
    return {
      damageToTarget: base,
      damageToAttacker: 0,
      nullified: false,
      defenseConsumed: defense ? true : false,
    };
  }

  switch (defense.defense) {
    case "reduce_third":
      return out(Math.round(base * (2 / 3)), 0);
    case "reduce_half":
      return out(Math.round(base * (1 / 2)), 0);
    case "reduce_twothirds":
      return out(Math.round(base * (1 / 3)), 0);
    case "reflect":
      return out(0, base);
    case "nullify_fatal":
      // Hard counter only matters vs fatal; vs a normal attack it does nothing.
      return out(base, 0);
    default:
      return out(base, 0);
  }

  function out(damageToTarget: number, damageToAttacker: number): AttackResolution {
    return { damageToTarget, damageToAttacker, nullified: false, defenseConsumed: true };
  }
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
