import { describe, expect, it } from "vitest";
import { HAND_SIZE } from "./cards";
import {
  addCpuPlayer,
  addPlayer,
  applyAction,
  createRoomState,
  currentPlayerId,
  makePlayer,
  setReady,
  startGame,
} from "./room";
import type { Card, RoomState } from "./types";

function freshGame(): RoomState {
  const host = makePlayer("h", "Host", { isHost: true });
  host.isReady = true;
  let s = createRoomState("TEST", host);
  s = addPlayer(s, "p2", "Bob");
  s = setReady(s, "p2", true);
  return startGame(s);
}

describe("startGame", () => {
  it("adds a CPU when exactly two humans start", () => {
    const s = freshGame();
    expect(s.phase).toBe("action");
    expect(s.players).toHaveLength(3);
    expect(s.players.some((p) => p.isCPU)).toBe(true);
    expect(s.turnOrder).toHaveLength(3);
    for (const p of s.players) {
      expect(s.hands[p.id]).toHaveLength(HAND_SIZE);
      expect(p.hp).toBe(100);
    }
  });
});

describe("solo / CPU lobby", () => {
  it("starts a solo match with one human plus added CPUs", () => {
    const host = makePlayer("h", "Host", { isHost: true });
    host.isReady = true;
    let s = createRoomState("SOLO", host);
    s = addCpuPlayer(s);
    s = addCpuPlayer(s);
    expect(s.players).toHaveLength(3);

    s = startGame(s);
    expect(s.phase).toBe("action");
    // No extra auto-add when bots are already present.
    expect(s.players.filter((p) => p.isCPU)).toHaveLength(2);
    expect(s.turnOrder).toHaveLength(3);
  });

  it("does not start with only one participant", () => {
    const host = makePlayer("h", "Host", { isHost: true });
    host.isReady = true;
    const s = startGame(createRoomState("SOLO", host));
    expect(s.phase).toBe("lobby");
  });
});

describe("attack resolution through the reducer", () => {
  it("applies undefended damage and advances the turn", () => {
    let s = freshGame();
    const attackerId = currentPlayerId(s)!;
    const target = s.players.find((p) => p.id !== attackerId && p.alive)!;

    const card: Card = {
      id: "atk1",
      kind: "attack",
      color: "colorless",
      name: "Test Strike",
      damage: 20,
      attackTarget: "choose", // deterministic target for the test
      description: "",
    };
    s.hands[attackerId] = [card, ...s.hands[attackerId]];
    const hpBefore = target.hp;

    s = applyAction(s, { type: "play_attack", cardId: "atk1", targetId: target.id }, attackerId);
    if (s.phase === "defense") {
      s = applyAction(s, { type: "defend", cardId: null }, target.id);
    }

    const after = s.players.find((p) => p.id === target.id)!;
    expect(after.hp).toBe(hpBefore - 20);
    // Attacker refilled to a full hand and the turn moved on.
    expect(s.hands[attackerId]).toHaveLength(HAND_SIZE);
    expect(currentPlayerId(s)).not.toBe(attackerId);
  });

  it("lets the target nullify a fatal attack with any defense card", () => {
    let s = freshGame();
    const attackerId = currentPlayerId(s)!;
    const target = s.players.find((p) => p.id !== attackerId && p.alive)!;

    const fatal: Card = {
      id: "fat1",
      kind: "attack",
      color: "red",
      name: "Fatal Strike",
      damage: 30,
      fatal: true,
      attackTarget: "choose",
      description: "",
    };
    const shield: Card = {
      id: "shield1",
      kind: "defense",
      color: "blue",
      name: "Guard",
      defense: "block",
      description: "",
    };
    s.hands[attackerId] = [fatal, ...s.hands[attackerId]];
    s.hands[target.id] = [shield];
    const hpBefore = target.hp;

    s = applyAction(s, { type: "play_attack", cardId: "fat1", targetId: target.id }, attackerId);
    expect(s.phase).toBe("defense");
    s = applyAction(s, { type: "defend", cardId: "shield1" }, target.id);

    const after = s.players.find((p) => p.id === target.id)!;
    expect(after.hp).toBe(hpBefore); // fully negated
    expect(after.alive).toBe(true);
  });
});

describe("flow-based targeting", () => {
  function atkCard(id: string, target: Card["attackTarget"], dmg = 15): Card {
    return { id, kind: "attack", color: "colorless", name: "", description: "", damage: dmg, attackTarget: target };
  }

  it('"next" flare hits the next star in orbit', () => {
    let s = freshGame();
    const attacker = currentPlayerId(s)!;
    const ai = s.turnOrder.indexOf(attacker);
    const nextId = s.turnOrder[(ai + 1) % s.turnOrder.length];
    s.hands[attacker] = [atkCard("n1", "next")];
    // Give the target no shields so it auto-resolves (takes the hit).
    s.hands[nextId] = [atkCard("x", "next")];
    const before = s.players.find((p) => p.id === nextId)!.hp;

    s = applyAction(s, { type: "play_attack", cardId: "n1" }, attacker);
    expect(s.players.find((p) => p.id === nextId)!.hp).toBe(before - 15);
  });

  it("AOE flare dims every other star", () => {
    let s = freshGame();
    const attacker = currentPlayerId(s)!;
    s.hands[attacker] = [atkCard("aoe", "all", 6)];
    const before = new Map(s.players.map((p) => [p.id, p.hp]));

    s = applyAction(s, { type: "play_attack", cardId: "aoe" }, attacker);
    for (const p of s.players) {
      if (p.id === attacker) expect(p.hp).toBe(before.get(p.id));
      else expect(p.hp).toBe(before.get(p.id)! - 6);
    }
  });

  it("Retrograde reverses the orbit direction", () => {
    let s = freshGame();
    const dir = s.direction;
    const actor = currentPlayerId(s)!;
    const rev: Card = { id: "rev", kind: "special", color: "colorless", name: "", description: "", special: "reverse" };
    s.hands[actor] = [rev];
    s = applyAction(s, { type: "play_special", cardId: "rev" }, actor);
    expect(s.direction).toBe(dir === 1 ? -1 : 1);
  });
});

describe("rejecting illegal actions", () => {
  it("ignores actions from a player when it is not their turn", () => {
    const s = freshGame();
    const attackerId = currentPlayerId(s)!;
    const other = s.players.find((p) => p.id !== attackerId)!;
    const before = s.version;
    const next = applyAction(s, { type: "pass" }, other.id);
    expect(next.version).toBe(before); // unchanged
  });
});
