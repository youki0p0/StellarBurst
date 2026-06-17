// Shared type definitions for StellarBurst.

export type CardColor = "colorless" | "red" | "blue" | "green";
export type CardKind = "attack" | "defense" | "special";

export type DefenseEffect =
  | "block" // fully cut all incoming damage
  | "reflect" // fully cut, and reflect the damage back to the attacker
  | "pass"; // don't take it — shove the attack onto the next player

export type SpecialEffect =
  | "heal" // heal self
  | "shuffle_hands" // shuffle and redistribute every player's hand
  | "skip_turn" // chance to skip the NEXT player's action (UNO Skip)
  | "reverse" // flip the turn-order direction (UNO Reverse)
  | "slip_damage"; // damage over the next player's next 3 turns

/**
 * Where an attack lands. Most attacks are flow-based (turn-order relative) so
 * nobody gets freely focus-fired; "choose" is reserved for rare cards.
 */
export type AttackTarget =
  | "next" // the next player in turn order
  | "prev" // the previous player (counter-flow)
  | "random" // a random opponent
  | "all" // everyone else, small damage (AOE)
  | "choose"; // free pick — rare cards only

export interface Card {
  /** Unique per-instance id. */
  id: string;
  kind: CardKind;
  name: string;
  /** Color for attack/defense cards; "colorless" for specials. */
  color: CardColor;
  description: string;
  // attack
  damage?: number;
  fatal?: boolean;
  /** How the attack picks its target. Defaults to "next". */
  attackTarget?: AttackTarget;
  /** If true, an undefended hit continues to the next player. */
  chain?: boolean;
  // defense
  defense?: DefenseEffect;
  // special
  special?: SpecialEffect;
  /** Generic magnitude: heal amount, slip-per-turn, or probability %. */
  value?: number;
}

export interface PlayerEffects {
  /** When true, the player's next turn is skipped. */
  skipNextTurn: boolean;
  /** Number of the player's upcoming turns during which defense is disabled. */
  defenseLimitedTurns: number;
  /** Damage-over-time applied at the start of the player's turns. */
  slip: { perTurn: number; turnsLeft: number } | null;
  /** Free flare-blocks granted by a STELLA buff; each consumes one incoming hit. */
  guard: number;
}

export interface Player {
  /** Stable DB primary key (uuid). Used everywhere as the player's identity. */
  id: string;
  /** Per-browser client id from localStorage; identifies the human behind a seat. */
  clientId: string;
  name: string;
  hp: number;
  maxHp: number;
  isCPU: boolean;
  isHost: boolean;
  isReady: boolean;
  alive: boolean;
  connected: boolean;
  effects: PlayerEffects;
}

export type GamePhase = "lobby" | "action" | "stella" | "defense" | "finished";

/**
 * A live "STELLA!" finishing call. Opened when an attacker declares a killing
 * blow. During the window other living players race to point it out (call_out),
 * and the targeted star can point out to escape (nullify + buff).
 */
export interface StellaCall {
  attackerId: string;
  targetId: string;
  /**
   * Whether the declared flare would actually darken the target (computed at
   * declaration, undefended). Fixes whether point-outs are correct (buff) or
   * mistaken (−10), independent of how the blow finally resolves.
   */
  wouldKill: boolean;
  /** Ids of non-target players who have pointed out, in order (first = catcher). */
  pointedBy: string[];
  /** Wall-clock ms after which the host auto-resolves the window. */
  deadline: number;
}

export interface PendingAttack {
  attackerId: string;
  targetId: string;
  card: Card;
  /** Number of times this attack has been forwarded (pass/chain), for loop guarding. */
  hops?: number;
}

export interface GameEvent {
  id: string;
  ts: number;
  type:
    | "info"
    | "attack"
    | "defend"
    | "reflect"
    | "heal"
    | "special"
    | "slip"
    | "skip"
    | "eliminate"
    | "win";
  /** i18n template key (e.g. "log.attack"); rendered client-side per language. */
  key: string;
  /** Interpolation params for the template (names, numbers, card-name keys). */
  params?: Record<string, string | number>;
  actorId?: string;
  targetId?: string;
}

export interface RoomState {
  code: string;
  seed: number;
  phase: GamePhase;
  hostId: string;
  players: Player[];
  /** Ordered list of player ids defining turn order. */
  turnOrder: string[];
  currentTurnIndex: number;
  /** Turn-order direction: +1 forward, -1 reversed (UNO Reverse). */
  direction: 1 | -1;
  /** An open STELLA! finishing call (reaction window), if any. */
  stella: StellaCall | null;
  /** Per-player hand of cards (keyed by player id). */
  hands: Record<string, Card[]>;
  pending: PendingAttack | null;
  log: GameEvent[];
  winnerId: string | null;
  /** Monotonic version, bumped on every host mutation. */
  version: number;
}

/** Actions a client can request from the host-authoritative reducer. */
export type GameAction =
  // `stella` declares a finishing blow (opens the STELLA window); `targetId`
  // only for rare "choose" cards.
  | { type: "play_attack"; cardId: string; targetId?: string; stella?: boolean }
  | { type: "play_heal"; cardId: string }
  | { type: "play_special"; cardId: string }
  | { type: "pass" }
  | { type: "defend"; cardId: string | null }
  | { type: "call_out" }; // point out the open STELLA finish (指摘)
