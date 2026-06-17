import { describe, expect, it } from "vitest";
import {
  COLORLESS_ATTACK_RATIO,
  drawCard,
  mulberry32,
  shuffle,
} from "./cards";

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe("shuffle", () => {
  it("preserves all elements", () => {
    const rng = mulberry32(7);
    const out = shuffle([1, 2, 3, 4, 5], rng);
    expect(out.slice().sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("drawCard", () => {
  it("always produces a valid, well-formed card", () => {
    const rng = mulberry32(99);
    for (let i = 0; i < 500; i++) {
      const c = drawCard(rng);
      expect(["attack", "defense", "special"]).toContain(c.kind);
      expect(["colorless", "red", "blue", "green"]).toContain(c.color);
      if (c.kind === "attack" && !c.fatal) {
        // AOE flares hit for less; single-target/chain flares are larger.
        const lo = c.attackTarget === "all" ? 4 : 8;
        expect(c.damage!).toBeGreaterThanOrEqual(lo);
        expect(c.damage!).toBeLessThanOrEqual(30);
      }
      if (c.kind === "special") expect(c.color).toBe("colorless");
    }
  });

  it("makes roughly 60% of attack cards colorless", () => {
    const rng = mulberry32(2024);
    let attacks = 0;
    let colorless = 0;
    for (let i = 0; i < 8000; i++) {
      const c = drawCard(rng);
      if (c.kind === "attack") {
        attacks++;
        if (c.color === "colorless") colorless++;
      }
    }
    const ratio = colorless / attacks;
    expect(ratio).toBeGreaterThan(COLORLESS_ATTACK_RATIO - 0.08);
    expect(ratio).toBeLessThan(COLORLESS_ATTACK_RATIO + 0.08);
  });
});
