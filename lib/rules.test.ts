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
    expect(canDefend(atk("colorless"), def("red", "reduce_half"))).toBe(true);
    expect(canDefend(atk("colorless"), def("colorless", "reduce_half"))).toBe(true);
  });
  it("colored attack needs matching color or colorless wildcard", () => {
    expect(canDefend(atk("red"), def("red", "reduce_half"))).toBe(true);
    expect(canDefend(atk("red"), def("colorless", "reduce_half"))).toBe(true);
    expect(canDefend(atk("red"), def("blue", "reduce_half"))).toBe(false);
  });
});

describe("resolveAttack (damage math)", () => {
  it("full damage when undefended", () => {
    expect(resolveAttack(atk("red", 30), null, 100).damageToTarget).toBe(30);
  });
  it("reduces by 1/3, 1/2, 2/3", () => {
    expect(resolveAttack(atk("colorless", 30), def("red", "reduce_third"), 100).damageToTarget).toBe(20);
    expect(resolveAttack(atk("colorless", 30), def("red", "reduce_half"), 100).damageToTarget).toBe(15);
    expect(resolveAttack(atk("colorless", 30), def("red", "reduce_twothirds"), 100).damageToTarget).toBe(10);
  });
  it("reflects damage back to attacker", () => {
    const r = resolveAttack(atk("colorless", 25), def("red", "reflect"), 100);
    expect(r.damageToTarget).toBe(0);
    expect(r.damageToAttacker).toBe(25);
  });
  it("an invalid-color defense does not reduce damage", () => {
    expect(resolveAttack(atk("red", 30), def("blue", "reduce_half"), 100).damageToTarget).toBe(30);
  });
});

describe("fatal attacks", () => {
  it("is lethal when undefended (but only because no defense was held)", () => {
    expect(resolveAttack(atk("colorless", 999, true), null, 70).damageToTarget).toBe(70);
  });
  it("is nullified by ANY defense card", () => {
    const r = resolveAttack(atk("red", 999, true), def("blue", "reduce_third"), 70);
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
