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
      description: "",
    };
    const shield: Card = {
      id: "shield1",
      kind: "defense",
      color: "blue",
      name: "Guard",
      defense: "reduce_third",
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
