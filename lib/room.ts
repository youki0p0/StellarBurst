import {
  drawAttack,
  drawCard,
  drawCards,
  HAND_SIZE,
  MAX_HP,
  mulberry32,
  shuffle,
} from "./cards";
import { cardNameKey } from "./i18n";
import {
  applyDamage,
  applyHeal,
  canDefend,
  canUseDefense,
  findWinner,
  resolveAttack,
} from "./rules";
import type {
  Card,
  GameAction,
  GameEvent,
  Player,
  PlayerEffects,
  RoomState,
} from "./types";

export function generateRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export const MAX_PLAYERS = 8;

function emptyEffects(): PlayerEffects {
  return { skipNextTurn: false, defenseLimitedTurns: 0, slip: null };
}

export function makePlayer(
  id: string,
  name: string,
  opts: { isHost?: boolean; isCPU?: boolean; clientId?: string } = {},
): Player {
  return {
    id,
    clientId: opts.clientId ?? id,
    name,
    hp: MAX_HP,
    maxHp: MAX_HP,
    isCPU: opts.isCPU ?? false,
    isHost: opts.isHost ?? false,
    isReady: opts.isCPU ? true : false,
    alive: true,
    connected: true,
    effects: emptyEffects(),
  };
}

/** Cross-environment uuid (browser + node test runner both have it). */
export function newId(): string {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function createRoomState(code: string, host: Player): RoomState {
  return {
    code,
    seed: Math.floor(Math.random() * 2 ** 31),
    phase: "lobby",
    hostId: host.id,
    players: [host],
    turnOrder: [],
    currentTurnIndex: 0,
    hands: {},
    pending: null,
    log: [],
    winnerId: null,
    version: 0,
  };
}

let eventCounter = 0;
function pushEvent(state: RoomState, e: Omit<GameEvent, "id" | "ts">): void {
  eventCounter += 1;
  state.log.push({ id: `e${eventCounter}`, ts: Date.now(), ...e });
  // Keep the log bounded so broadcast payloads stay small.
  if (state.log.length > 80) state.log = state.log.slice(-80);
}

function getPlayer(state: RoomState, id: string): Player | undefined {
  return state.players.find((p) => p.id === id);
}

export function currentPlayerId(state: RoomState): string | null {
  return state.turnOrder[state.currentTurnIndex] ?? null;
}

// --- Lobby mutations ------------------------------------------------------

export function addPlayer(state: RoomState, id: string, name: string): RoomState {
  if (state.phase !== "lobby") return state;
  const existing = getPlayer(state, id);
  if (existing) {
    existing.connected = true;
    existing.name = name;
    return bump(state);
  }
  if (state.players.length >= MAX_PLAYERS) return state;
  state.players.push(makePlayer(id, name));
  pushEvent(state, { type: "info", key: "log.joined", params: { name } });
  return bump(state);
}

export function removePlayer(state: RoomState, id: string): RoomState {
  const player = getPlayer(state, id);
  if (!player) return state;
  if (state.phase === "lobby") {
    state.players = state.players.filter((p) => p.id !== id);
  } else {
    player.connected = false;
  }
  return bump(state);
}

export function setReady(state: RoomState, id: string, ready: boolean): RoomState {
  const player = getPlayer(state, id);
  if (!player) return state;
  player.isReady = ready;
  return bump(state);
}

// --- Game start -----------------------------------------------------------

/** Add a CPU opponent in the lobby (e.g. for solo / practice play). */
export function addCpuPlayer(state: RoomState): RoomState {
  if (state.phase !== "lobby") return state;
  if (state.players.length >= MAX_PLAYERS) return state;
  const cpuId = newId();
  const n = state.players.filter((p) => p.isCPU).length + 1;
  state.players.push(makePlayer(cpuId, `CPU ${n}`, { isCPU: true, clientId: cpuId }));
  return bump(state);
}

export function startGame(state: RoomState): RoomState {
  if (state.phase !== "lobby") return state;
  const humans = state.players.filter((p) => !p.isCPU);
  if (humans.length < 1) return state; // need at least one human
  if (state.players.length < 2) return state; // need at least two participants

  // Spec convenience: if exactly two humans start with no bots, add 1 CPU rival.
  const hasCpu = state.players.some((p) => p.isCPU);
  if (humans.length === 2 && !hasCpu && state.players.length < MAX_PLAYERS) {
    const cpuId = newId();
    state.players.push(
      makePlayer(cpuId, "CPU Rival", { isCPU: true, clientId: cpuId }),
    );
  }

  const rng = mulberry32(state.seed);
  state.turnOrder = shuffle(
    state.players.map((p) => p.id),
    rng,
  );
  state.hands = {};
  for (const p of state.players) {
    p.hp = MAX_HP;
    p.alive = true;
    p.effects = emptyEffects();
    state.hands[p.id] = drawCards(HAND_SIZE);
  }
  state.currentTurnIndex = -1; // startNextTurn will advance to 0
  state.winnerId = null;
  state.pending = null;
  state.phase = "action";
  pushEvent(state, { type: "info", key: "log.begin" });
  startNextTurn(state);
  return bump(state);
}

/** Reset back to the lobby for a rematch, dropping CPU players. */
export function resetToLobby(state: RoomState): RoomState {
  state.players = state.players.filter((p) => !p.isCPU);
  for (const p of state.players) {
    p.hp = MAX_HP;
    p.alive = true;
    p.effects = emptyEffects();
    p.isReady = p.isHost; // host stays ready
  }
  state.phase = "lobby";
  state.turnOrder = [];
  state.currentTurnIndex = 0;
  state.hands = {};
  state.pending = null;
  state.winnerId = null;
  state.log = [];
  pushEvent(state, { type: "info", key: "log.rematch" });
  return bump(state);
}

// --- Damage / death helpers ----------------------------------------------

function dealDamage(state: RoomState, targetId: string, amount: number): void {
  const target = getPlayer(state, targetId);
  if (!target || amount <= 0) return;
  target.hp = applyDamage(target.hp, amount);
  reap(state, target);
}

function reap(state: RoomState, player: Player): void {
  if (player.alive && player.hp <= 0) {
    player.alive = false;
    pushEvent(state, {
      type: "eliminate",
      actorId: player.id,
      key: "log.eliminate",
      params: { name: player.name },
    });
  }
}

function checkWin(state: RoomState): void {
  const winner = findWinner(state.players);
  if (winner) {
    const p = getPlayer(state, winner);
    state.winnerId = winner;
    state.phase = "finished";
    pushEvent(state, {
      type: "win",
      actorId: winner,
      key: "log.win",
      params: { name: p?.name ?? "?" },
    });
  }
}

// --- Turn flow ------------------------------------------------------------

function runBeginEffects(state: RoomState, p: Player): void {
  if (p.effects.slip) {
    const dmg = p.effects.slip.perTurn;
    dealDamage(state, p.id, dmg);
    p.effects.slip.turnsLeft -= 1;
    pushEvent(state, {
      type: "slip",
      actorId: p.id,
      key: "log.slipTick",
      params: { name: p.name, dmg },
    });
    if (p.effects.slip.turnsLeft <= 0) p.effects.slip = null;
  }
  if (p.effects.defenseLimitedTurns > 0) {
    p.effects.defenseLimitedTurns -= 1;
  }
}

/** Advance to the next eligible player, applying begin-of-turn effects. */
function startNextTurn(state: RoomState): void {
  const order = state.turnOrder;
  if (order.length === 0) return;
  let guard = 0;
  while (guard++ < order.length * 4) {
    state.currentTurnIndex = (state.currentTurnIndex + 1) % order.length;
    const pid = order[state.currentTurnIndex];
    const p = getPlayer(state, pid);
    if (!p || !p.alive || p.hp <= 0) continue;

    runBeginEffects(state, p);
    checkWin(state);
    if (state.phase === "finished") return;
    if (!p.alive || p.hp <= 0) continue; // died to slip damage

    if (p.effects.skipNextTurn) {
      p.effects.skipNextTurn = false;
      pushEvent(state, {
        type: "skip",
        actorId: p.id,
        key: "log.skipped",
        params: { name: p.name },
      });
      continue;
    }
    return; // this player takes their turn
  }
}

function drawTo(state: RoomState, playerId: string): void {
  const hand = state.hands[playerId] ?? [];
  while (hand.length < HAND_SIZE) hand.push(drawCard());
  // Never leave a player with an all-defense hand (defense is reactive only, so
  // they'd be unable to act on their turn). Guarantee at least one attack card:
  // swap a defense card for a fresh attack. This covers "4 defense + 1 → attack"
  // and the all-defense safety case.
  if (!hand.some((c) => c.kind === "attack")) {
    const idx = hand.findIndex((c) => c.kind === "defense");
    hand[idx === -1 ? hand.length - 1 : idx] = drawAttack();
  }
  state.hands[playerId] = hand;
}

function endTurn(state: RoomState, actorId: string): void {
  drawTo(state, actorId);
  state.pending = null;
  checkWin(state);
  if (state.phase === "finished") return;
  state.phase = "action";
  startNextTurn(state);
}

function removeCard(state: RoomState, playerId: string, cardId: string): Card | null {
  const hand = state.hands[playerId];
  if (!hand) return null;
  const idx = hand.findIndex((c) => c.id === cardId);
  if (idx === -1) return null;
  return hand.splice(idx, 1)[0];
}

// --- Specials -------------------------------------------------------------

function applySpecial(state: RoomState, actor: Player, card: Card, targetId?: string): void {
  switch (card.special) {
    case "heal": {
      const amount = card.value ?? 20;
      actor.hp = applyHeal(actor.hp, actor.maxHp, amount);
      pushEvent(state, {
        type: "heal",
        actorId: actor.id,
        key: "log.heal",
        params: { name: actor.name, amt: amount },
      });
      break;
    }
    case "shuffle_hands": {
      const ids = state.players.filter((p) => p.alive).map((p) => p.id);
      const pool: Card[] = [];
      const counts: Record<string, number> = {};
      for (const id of ids) {
        const hand = state.hands[id] ?? [];
        counts[id] = hand.length;
        pool.push(...hand);
      }
      const shuffled = shuffle(pool, Math.random);
      let cursor = 0;
      for (const id of ids) {
        state.hands[id] = shuffled.slice(cursor, cursor + counts[id]);
        cursor += counts[id];
      }
      pushEvent(state, {
        type: "special",
        actorId: actor.id,
        key: "log.shuffle",
        params: { name: actor.name },
      });
      break;
    }
    case "skip_turn": {
      const target = targetId ? getPlayer(state, targetId) : undefined;
      if (!target) break;
      const chance = (card.value ?? 60) / 100;
      if (Math.random() < chance) {
        target.effects.skipNextTurn = true;
        pushEvent(state, {
          type: "special",
          actorId: actor.id,
          targetId: target.id,
          key: "log.skipOk",
          params: { name: actor.name, target: target.name },
        });
      } else {
        pushEvent(state, {
          type: "special",
          actorId: actor.id,
          targetId: target.id,
          key: "log.skipFail",
          params: { name: actor.name, target: target.name },
        });
      }
      break;
    }
    case "limit_defense": {
      const target = targetId ? getPlayer(state, targetId) : undefined;
      if (!target) break;
      target.effects.defenseLimitedTurns = 3;
      pushEvent(state, {
        type: "special",
        actorId: actor.id,
        targetId: target.id,
        key: "log.cripple",
        params: { name: actor.name, target: target.name },
      });
      break;
    }
    case "slip_damage": {
      const target = targetId ? getPlayer(state, targetId) : undefined;
      if (!target) break;
      target.effects.slip = { perTurn: card.value ?? 10, turnsLeft: 3 };
      pushEvent(state, {
        type: "special",
        actorId: actor.id,
        targetId: target.id,
        key: "log.slip",
        params: { name: actor.name, target: target.name },
      });
      break;
    }
  }
}

// --- Main reducer ---------------------------------------------------------

/**
 * Validate and apply an action requested by `actorId`. Returns a new state
 * (the host is the single source of truth). Invalid actions are ignored.
 */
export function applyAction(
  input: RoomState,
  action: GameAction,
  actorId: string,
): RoomState {
  const state: RoomState = structuredClone(input);
  const actor = getPlayer(state, actorId);
  if (!actor || !actor.alive) return input;

  // Defense responses happen during the defense phase, by the target only.
  if (action.type === "defend") {
    if (state.phase !== "defense" || !state.pending) return input;
    if (state.pending.targetId !== actorId) return input;
    return resolveDefense(state, action.cardId);
  }

  // All other actions require it to be the actor's turn in the action phase.
  if (state.phase !== "action") return input;
  if (currentPlayerId(state) !== actorId) return input;

  switch (action.type) {
    case "pass": {
      pushEvent(state, {
        type: "info",
        actorId: actor.id,
        key: "log.pass",
        params: { name: actor.name },
      });
      endTurn(state, actorId);
      return bump(state);
    }
    case "play_heal": {
      const card = removeCard(state, actorId, action.cardId);
      if (!card || card.special !== "heal") return input;
      applySpecial(state, actor, card);
      endTurn(state, actorId);
      return bump(state);
    }
    case "play_special": {
      const peek = (state.hands[actorId] ?? []).find((c) => c.id === action.cardId);
      if (!peek || peek.kind !== "special") return input;
      // Targeted specials require a valid, living target.
      const needsTarget =
        peek.special === "skip_turn" ||
        peek.special === "limit_defense" ||
        peek.special === "slip_damage";
      if (needsTarget) {
        const target = action.targetId ? getPlayer(state, action.targetId) : undefined;
        if (!target || !target.alive) return input;
      }
      const card = removeCard(state, actorId, action.cardId)!;
      applySpecial(state, actor, card, action.targetId);
      endTurn(state, actorId);
      return bump(state);
    }
    case "play_attack": {
      const peek = (state.hands[actorId] ?? []).find((c) => c.id === action.cardId);
      if (!peek || peek.kind !== "attack") return input;
      const target = getPlayer(state, action.targetId);
      if (!target || !target.alive || target.id === actorId) return input;
      const card = removeCard(state, actorId, action.cardId)!;
      state.pending = { attackerId: actorId, targetId: target.id, card };
      state.phase = "defense";
      pushEvent(state, {
        type: "attack",
        actorId: actor.id,
        targetId: target.id,
        key: card.fatal ? "log.attackFatal" : "log.attack",
        params: {
          name: actor.name,
          target: target.name,
          card: cardNameKey(card),
          dmg: card.damage ?? 0,
        },
      });
      // If the target can't possibly respond, auto-resolve as "take it".
      if (!canRespondToAttack(state, target.id)) {
        return resolveDefense(state, null);
      }
      return bump(state);
    }
    default:
      return input;
  }
}

/** Does the target hold a defense card they're allowed to use right now? */
function canRespondToAttack(state: RoomState, targetId: string): boolean {
  const target = getPlayer(state, targetId);
  if (!target || !canUseDefense(target)) return false;
  const hand = state.hands[targetId] ?? [];
  const attack = state.pending?.card;
  if (!attack) return false;
  return hand.some(
    (c) => c.kind === "defense" && (attack.fatal || canDefend(attack, c)),
  );
}

function resolveDefense(state: RoomState, cardId: string | null): RoomState {
  const pending = state.pending!;
  const attacker = getPlayer(state, pending.attackerId)!;
  const target = getPlayer(state, pending.targetId)!;

  let defenseCard: Card | null = null;
  if (cardId) {
    const hand = state.hands[target.id] ?? [];
    const candidate = hand.find((c) => c.id === cardId);
    const usable =
      candidate &&
      candidate.kind === "defense" &&
      canUseDefense(target) &&
      (pending.card.fatal || canDefend(pending.card, candidate));
    if (usable) defenseCard = candidate!;
  }

  const result = resolveAttack(pending.card, defenseCard, target.hp);

  if (defenseCard && result.defenseConsumed) {
    removeCard(state, target.id, defenseCard.id);
  }

  if (result.nullified) {
    pushEvent(state, {
      type: "defend",
      actorId: target.id,
      key: "log.negate",
      params: { target: target.name, card: defenseCard ? cardNameKey(defenseCard) : "" },
    });
  } else if (result.damageToAttacker > 0) {
    dealDamage(state, attacker.id, result.damageToAttacker);
    pushEvent(state, {
      type: "reflect",
      actorId: target.id,
      targetId: attacker.id,
      key: "log.reflect",
      params: { target: target.name, attacker: attacker.name, dmg: result.damageToAttacker },
    });
  } else if (defenseCard) {
    dealDamage(state, target.id, result.damageToTarget);
    pushEvent(state, {
      type: "defend",
      actorId: target.id,
      key: "log.block",
      params: { target: target.name, card: cardNameKey(defenseCard), dmg: result.damageToTarget },
    });
  } else {
    dealDamage(state, target.id, result.damageToTarget);
    pushEvent(state, {
      type: "attack",
      actorId: attacker.id,
      targetId: target.id,
      key: "log.takeDamage",
      params: { target: target.name, dmg: result.damageToTarget },
    });
  }

  endTurn(state, pending.attackerId);
  return bump(state);
}

function bump(state: RoomState): RoomState {
  state.version += 1;
  return state;
}
