import { describe, expect, it } from "vitest";
import { canDefend, findWinner, resolveAttack } from "./rules";
import type { Card, Player } from "./types";

function atk(color: Card["color"], damage = 30, fatal = false): Card {
  return { id: "a", kind: "attack", color, name: "A", damage, fatal, description: "" };
}
function def(color: Card["color"], effect: Card["defense"]): Card {
  return { id: "d", kind: "defense", color, name: "D", defense: effect, description: "" };
}
function player(id: string, hp: number, alive = true): Player {
  return {
    id,
    clientId: id,
    name: id,
    hp,
    maxHp: 100,
    isCPU: false,
    isHost: false,
    isReady: true,
    alive,
    connected: true,
    effects: { skipNextTurn: false, defenseLimitedTurns: 0, slip: null },
  };
}

describe("canDefend (color rules)", () => {
  it("colorless attack is defendable by any color", () => {
    expect(canDefend(atk("colorless"), def("red", "block"))).toBe(true);
    expect(canDefend(atk("colorless"), def("colorless", "block"))).toBe(true);
    expect(canDefend(atk("colorless"), def("green", "reflect"))).toBe(true);
  });
  it("colored attack is defendable ONLY by the same color", () => {
    expect(canDefend(atk("red"), def("red", "block"))).toBe(true);
    expect(canDefend(atk("red"), def("colorless", "block"))).toBe(false); // no wildcard
    expect(canDefend(atk("red"), def("blue", "block"))).toBe(false);
  });
});

describe("resolveAttack (block / reflect)", () => {
  it("full damage when undefended", () => {
    expect(resolveAttack(atk("red", 30), null, 100).damageToTarget).toBe(30);
  });
  it("block fully cuts the damage", () => {
    const r = resolveAttack(atk("colorless", 30), def("red", "block"), 100);
    expect(r.damageToTarget).toBe(0);
    expect(r.damageToAttacker).toBe(0);
    expect(r.defenseConsumed).toBe(true);
  });
  it("reflect fully cuts and bounces the full damage back", () => {
    const r = resolveAttack(atk("colorless", 25), def("red", "reflect"), 100);
    expect(r.damageToTarget).toBe(0);
    expect(r.damageToAttacker).toBe(25);
  });
  it("a wrong-color defense does not apply (full damage)", () => {
    expect(resolveAttack(atk("red", 30), def("blue", "block"), 100).damageToTarget).toBe(30);
  });
});

describe("fatal attacks", () => {
  it("is lethal when undefended", () => {
    expect(resolveAttack(atk("colorless", 999, true), null, 70).damageToTarget).toBe(70);
  });
  it("is nullified by ANY defense card (color-independent safety valve)", () => {
    const r = resolveAttack(atk("red", 999, true), def("blue", "block"), 70);
    expect(r.nullified).toBe(true);
    expect(r.damageToTarget).toBe(0);
    expect(r.defenseConsumed).toBe(true);
  });
});

describe("findWinner", () => {
  it("returns the sole survivor", () => {
    expect(findWinner([player("a", 50), player("b", 0, false)])).toBe("a");
  });
  it("returns null while multiple remain", () => {
    expect(findWinner([player("a", 50), player("b", 10)])).toBeNull();
  });
});
