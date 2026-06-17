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

/** At or below this Luminosity a star is critically dim (visual warning only). */
export const BURST_THRESHOLD = 25;

/** STELLA finishing-call tuning. */
export const STELLA_WINDOW_MS = 4500; // reaction window length
const STELLA_FAIL_PENALTY = 10; // caller declared STELLA but didn't finish
const MISPOINT_PENALTY = 10; // pointed out a finish that wasn't real (誤指摘)
const STELLA_BUFF_HEAL = 20; // luminosity restored by a "heal" buff

/** A critically dim star (low luminosity) — used for board glow/warning only. */
export function isBurst(p: Player): boolean {
  return p.alive && p.hp > 0 && p.hp <= BURST_THRESHOLD;
}

function emptyEffects(): PlayerEffects {
  return { skipNextTurn: false, defenseLimitedTurns: 0, slip: null, guard: 0 };
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
    direction: 1,
    stella: null,
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

/** The next living player id from `fromId` stepping in `dir` (excludes fromId). */
function stepAlive(state: RoomState, fromId: string, dir: number): string | null {
  const order = state.turnOrder;
  const n = order.length;
  const start = order.indexOf(fromId);
  if (start === -1 || n === 0) return null;
  for (let k = 1; k <= n; k++) {
    const id = order[(((start + dir * k) % n) + n) % n];
    if (id === fromId) continue;
    const p = getPlayer(state, id);
    if (p && p.alive && p.hp > 0) return id;
  }
  return null;
}

/** A random living opponent of `actorId`, or null. */
function randomOpponent(state: RoomState, actorId: string): string | null {
  const opps = state.players.filter((p) => p.alive && p.hp > 0 && p.id !== actorId);
  if (opps.length === 0) return null;
  return opps[Math.floor(Math.random() * opps.length)].id;
}

/** Resolve an attack card's target id from its targeting mode. */
export function attackTargetId(
  state: RoomState,
  actorId: string,
  card: Card,
  chosen?: string,
): string | null {
  switch (card.attackTarget ?? "next") {
    case "prev":
      return stepAlive(state, actorId, -state.direction);
    case "random":
      return randomOpponent(state, actorId);
    case "choose": {
      const t = chosen ? getPlayer(state, chosen) : undefined;
      return t && t.alive && t.id !== actorId ? t.id : null;
    }
    case "all":
      return null; // handled separately (AOE)
    case "next":
    default:
      return stepAlive(state, actorId, state.direction);
  }
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
  state.direction = 1;
  state.stella = null;
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
  state.direction = 1;
  state.stella = null;
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

/**
 * Apply flare damage to a star, but first spend any STELLA `guard` buff to fully
 * negate the hit. Returns true if a guard absorbed it. Use for incoming flare
 * damage (single hit / chain / AOE), never for slip / penalties.
 */
function takeFlare(state: RoomState, targetId: string, amount: number): boolean {
  const target = getPlayer(state, targetId);
  if (!target || amount <= 0) return false;
  if (target.effects.guard > 0) {
    target.effects.guard -= 1;
    pushEvent(state, {
      type: "defend",
      actorId: target.id,
      key: "log.guardHold",
      params: { name: target.name },
    });
    return true;
  }
  dealDamage(state, targetId, amount);
  return false;
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
  const n = order.length;
  let guard = 0;
  while (guard++ < n * 4) {
    state.currentTurnIndex = ((state.currentTurnIndex + state.direction) % n + n) % n;
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

function applySpecial(state: RoomState, actor: Player, card: Card): void {
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
    case "reverse": {
      state.direction = state.direction === 1 ? -1 : 1;
      pushEvent(state, {
        type: "special",
        actorId: actor.id,
        key: "log.reverse",
        params: { name: actor.name },
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
      // Skip the NEXT player (UNO Skip) — no free targeting.
      const targetId = stepAlive(state, actor.id, state.direction);
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
    case "slip_damage": {
      // Poison the next player.
      const targetId = stepAlive(state, actor.id, state.direction);
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

  // Defense responses happen during the defense (or STELLA) phase, by the
  // targeted star only.
  if (action.type === "defend") {
    if (!state.pending || state.pending.targetId !== actorId) return input;
    // During a STELLA window, defending/taking closes it. The target resolves
    // the flare normally — there is no special "point out to escape".
    if (state.phase === "stella" && state.stella) {
      return closeStella(state, action.cardId);
    }
    if (state.phase !== "defense") return input;
    return resolveDefense(state, action.cardId);
  }

  // 指摘 — point out the open STELLA finish (bystanders only).
  if (action.type === "call_out") {
    const s = state.stella;
    if (state.phase !== "stella" || !s || !state.pending) return input;
    // The caller can't point out their own finish; the target can't escape by
    // pointing out — they must defend or take the hit like any other attack.
    if (actorId === s.attackerId || actorId === s.targetId) return input;
    // A bystander points out; the first is the catcher. The window stays open
    // (and whether they were right isn't revealed until it resolves).
    if (s.pointedBy.includes(actorId)) return input;
    s.pointedBy.push(actorId);
    pushEvent(state, { type: "info", actorId, key: "log.pointOut", params: { name: actor.name } });
    return bump(state);
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
      const card = removeCard(state, actorId, action.cardId)!;
      applySpecial(state, actor, card);
      endTurn(state, actorId);
      return bump(state);
    }
    case "play_attack": {
      const peek = (state.hands[actorId] ?? []).find((c) => c.id === action.cardId);
      if (!peek || peek.kind !== "attack") return input;

      // AOE: small damage to every opponent, no defense window.
      if (peek.attackTarget === "all") {
        const card = removeCard(state, actorId, action.cardId)!;
        const dmg = card.damage ?? 6;
        pushEvent(state, {
          type: "attack",
          actorId: actor.id,
          key: "log.aoe",
          params: { name: actor.name, dmg },
        });
        for (const o of state.players.filter((p) => p.alive && p.id !== actorId)) {
          takeFlare(state, o.id, dmg);
        }
        endTurn(state, actorId);
        return bump(state);
      }

      // Single-target: resolve the target from the card's mode (free pick only
      // for rare "choose" cards).
      const targetId = attackTargetId(state, actorId, peek, action.targetId);
      const target = targetId ? getPlayer(state, targetId) : undefined;
      if (!target || !target.alive || target.id === actorId) return input;

      const card = removeCard(state, actorId, action.cardId)!;
      state.pending = { attackerId: actorId, targetId: target.id, card, hops: 0 };

      // Declared finishing blow → open the STELLA reaction window instead of
      // resolving immediately.
      if (action.stella) {
        state.stella = {
          attackerId: actorId,
          targetId: target.id,
          wouldKill: card.fatal === true || (card.damage ?? 0) >= target.hp,
          pointedBy: [],
          deadline: Date.now() + STELLA_WINDOW_MS,
        };
        state.phase = "stella";
        pushEvent(state, {
          type: "attack",
          actorId: actor.id,
          targetId: target.id,
          key: "log.stellaDeclare",
          params: { name: actor.name, target: target.name },
        });
        return bump(state);
      }

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
    (c) =>
      c.kind === "defense" &&
      // pass works on anything; block/reflect need a valid color (fatal: any).
      (c.defense === "pass" || attack.fatal || canDefend(attack, c)),
  );
}

/** Max times an attack can be forwarded (pass/chain) — around the orbit once. */
function maxHops(state: RoomState): number {
  return state.players.filter((p) => p.alive && p.hp > 0).length;
}

/** Forward the pending attack to the next player; auto-resolve if they can't respond. */
function forwardPending(state: RoomState, nextId: string, hops: number): RoomState {
  state.pending = { ...state.pending!, targetId: nextId, hops };
  state.phase = "defense";
  if (!canRespondToAttack(state, nextId)) {
    return resolveDefense(state, null);
  }
  return bump(state);
}

// --- STELLA finishing call -------------------------------------------------

/** Grant a random STELLA buff: rekindle / shield / an extra card over the cap. */
function grantBuff(state: RoomState, player: Player): void {
  const roll = Math.floor(Math.random() * 3);
  if (roll === 0) {
    player.hp = applyHeal(player.hp, player.maxHp, STELLA_BUFF_HEAL);
    pushEvent(state, {
      type: "heal",
      actorId: player.id,
      key: "log.buffHeal",
      params: { name: player.name, amt: STELLA_BUFF_HEAL },
    });
  } else if (roll === 1) {
    player.effects.guard += 1;
    pushEvent(state, { type: "defend", actorId: player.id, key: "log.buffShield", params: { name: player.name } });
  } else {
    const hand = state.hands[player.id] ?? (state.hands[player.id] = []);
    hand.push(drawCard());
    pushEvent(state, { type: "info", actorId: player.id, key: "log.buffCard", params: { name: player.name } });
  }
}

/**
 * Reward / punish the bystanders who pointed out, judged by whether the call
 * was a genuine finish (fixed at declaration): the first correct catcher gets a
 * buff; on a bluff, every pointer takes a light penalty (誤指摘).
 */
function judgePointers(state: RoomState, s: NonNullable<RoomState["stella"]>): void {
  if (s.pointedBy.length === 0) return;
  if (s.wouldKill) {
    const first = getPlayer(state, s.pointedBy[0]);
    if (first && first.alive) {
      pushEvent(state, { type: "info", actorId: first.id, key: "log.pointHit", params: { name: first.name } });
      grantBuff(state, first);
    }
  } else {
    for (const id of s.pointedBy) {
      const p = getPlayer(state, id);
      if (!p || !p.alive) continue;
      dealDamage(state, id, MISPOINT_PENALTY);
      pushEvent(state, { type: "info", actorId: id, key: "log.mispoint", params: { name: p.name, dmg: MISPOINT_PENALTY } });
    }
  }
}

/** Penalise the caller when their declared finish failed to darken the target. */
function callerPenalty(state: RoomState, attacker: Player, s: NonNullable<RoomState["stella"]>): void {
  const target = getPlayer(state, s.targetId);
  if (target && target.alive && target.hp > 0) {
    dealDamage(state, attacker.id, STELLA_FAIL_PENALTY);
    pushEvent(state, {
      type: "info",
      actorId: attacker.id,
      key: "log.stellaFail",
      params: { name: attacker.name, dmg: STELLA_FAIL_PENALTY },
    });
  }
}

/**
 * Close an open STELLA window: the target defended / took the hit (or it timed
 * out). The flare resolves as a single hit (no chain / pass forwarding during a
 * finish, and no special escape for the target). Then judge the bystander
 * point-outs and the caller, and end the turn.
 */
function closeStella(state: RoomState, cardId: string | null): RoomState {
  const s = state.stella!;
  const pending = state.pending!;
  const attacker = getPlayer(state, pending.attackerId)!;
  const target = getPlayer(state, pending.targetId)!;

  const chosen = cardId ? (state.hands[target.id] ?? []).find((c) => c.id === cardId) : undefined;
  let defenseCard: Card | null = null;
  if (
    chosen &&
    chosen.kind === "defense" &&
    chosen.defense !== "pass" && // pass-forwarding is disabled mid-finish
    canUseDefense(target) &&
    (pending.card.fatal || canDefend(pending.card, chosen))
  ) {
    defenseCard = chosen;
  }
  const result = resolveAttack(pending.card, defenseCard, target.hp);
  if (defenseCard && result.defenseConsumed) removeCard(state, target.id, defenseCard.id);

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
    pushEvent(state, {
      type: "defend",
      actorId: target.id,
      key: "log.block",
      params: { target: target.name, card: cardNameKey(defenseCard), dmg: 0 },
    });
  } else {
    const absorbed = takeFlare(state, target.id, result.damageToTarget);
    if (!absorbed) {
      pushEvent(state, {
        type: "attack",
        actorId: attacker.id,
        targetId: target.id,
        key: "log.takeDamage",
        params: { target: target.name, dmg: result.damageToTarget },
      });
    }
  }

  judgePointers(state, s);
  callerPenalty(state, attacker, s);
  state.stella = null;
  endTurn(state, pending.attackerId);
  return bump(state);
}

/** Host-driven: resolve an expired STELLA window as the target taking the hit. */
export function resolveStellaTimeout(state: RoomState): RoomState {
  if (state.phase !== "stella" || !state.stella || !state.pending) return state;
  return closeStella(state, null);
}

function resolveDefense(state: RoomState, cardId: string | null): RoomState {
  const pending = state.pending!;
  const attacker = getPlayer(state, pending.attackerId)!;
  const target = getPlayer(state, pending.targetId)!;
  const hops = pending.hops ?? 0;

  const chosen = cardId
    ? (state.hands[target.id] ?? []).find((c) => c.id === cardId)
    : undefined;

  // --- Pass: shove the attack onto the next player (no damage taken here). ---
  if (chosen && chosen.kind === "defense" && chosen.defense === "pass") {
    removeCard(state, target.id, chosen.id);
    const nextId = stepAlive(state, target.id, state.direction);
    pushEvent(state, {
      type: "defend",
      actorId: target.id,
      key: "log.passAttack",
      params: { target: target.name },
    });
    if (nextId && hops + 1 < maxHops(state)) {
      return forwardPending(state, nextId, hops + 1);
    }
    // Nowhere left to send it — the attack fizzles out into space.
    endTurn(state, pending.attackerId);
    return bump(state);
  }

  // --- Block / reflect / take ---
  let defenseCard: Card | null = null;
  if (chosen && chosen.kind === "defense" && canUseDefense(target) &&
      (pending.card.fatal || canDefend(pending.card, chosen))) {
    defenseCard = chosen;
  }

  const result = resolveAttack(pending.card, defenseCard, target.hp);
  if (defenseCard && result.defenseConsumed) {
    removeCard(state, target.id, defenseCard.id);
  }

  let tookFull = false;
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
    const absorbed = takeFlare(state, target.id, result.damageToTarget);
    if (!absorbed) {
      tookFull = true; // an absorbed hit doesn't chain onward
      pushEvent(state, {
        type: "attack",
        actorId: attacker.id,
        targetId: target.id,
        key: "log.takeDamage",
        params: { target: target.name, dmg: result.damageToTarget },
      });
    }
  }

  // --- Chain: an undefended hit continues to the next player. ---
  if (pending.card.chain && tookFull && hops + 1 < maxHops(state)) {
    checkWin(state);
    if (state.phase !== "finished") {
      const nextId = stepAlive(state, target.id, state.direction);
      if (nextId) {
        pushEvent(state, {
          type: "attack",
          actorId: attacker.id,
          targetId: nextId,
          key: "log.chain",
          params: { target: getPlayer(state, nextId)?.name ?? "?" },
        });
        return forwardPending(state, nextId, hops + 1);
      }
    }
  }

  endTurn(state, pending.attackerId);
  return bump(state);
}

function bump(state: RoomState): RoomState {
  state.version += 1;
  return state;
}
