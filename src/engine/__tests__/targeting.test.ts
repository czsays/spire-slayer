import { describe, it, expect } from "vitest";
import { simulateCardPlay } from "../simulator";
import { makeSimState, makeSimCard, makeSimEnemy } from "./fixtures";

// ─── Smart targeting via simulateCardPlay ───────────────────────

describe("smart targeting — debuff cards", () => {
  it("debuff card targets highest-HP enemy that survives", () => {
    // Debuff card deals 6 damage + applies 2 Vulnerable
    // Enemy A: 8 HP (would survive 6 damage), Enemy B: 30 HP (survives easily)
    // Both survive, so pick highest HP => Enemy B
    const state = makeSimState({
      energy: 3,
      enemies: [
        makeSimEnemy({ id: "e1", name: "Weak Slime", hp: 8, maxHp: 20 }),
        makeSimEnemy({ id: "e2", name: "Strong Slime", hp: 30, maxHp: 30 }),
      ],
      hand: [
        makeSimCard({
          id: "c1",
          name: "Bash",
          description: "Deal 6 damage. Apply 2 Vulnerable.",
        }),
      ],
    });

    const result = simulateCardPlay(state, "c1");
    expect(result?.target).toBe("Strong Slime");
    // Strong Slime took the damage
    expect(state.enemies[1].hp).toBe(24); // 30 - 6
    // Strong Slime got the vulnerability
    expect(state.enemies[1].vulnerable).toBe(2);
    // Weak Slime was untouched
    expect(state.enemies[0].hp).toBe(8);
    expect(state.enemies[0].vulnerable).toBe(0);
  });

  it("debuff card targets highest HP when all enemies would die", () => {
    // Both enemies have low HP, both would die from 10 damage
    const state = makeSimState({
      energy: 3,
      enemies: [
        makeSimEnemy({ id: "e1", name: "Tiny", hp: 3, maxHp: 10 }),
        makeSimEnemy({ id: "e2", name: "Small", hp: 5, maxHp: 10 }),
      ],
      hand: [
        makeSimCard({
          id: "c1",
          name: "Uppercut",
          description: "Deal 10 damage. Apply 1 Weak.",
        }),
      ],
    });

    const result = simulateCardPlay(state, "c1");
    // All would die => pick highest HP
    expect(result?.target).toBe("Small");
  });
});

describe("smart targeting — damage cards", () => {
  it("damage card targets killable enemy with least overkill", () => {
    // Card deals 6 damage
    // Enemy A: 5 HP (killable, 1 overkill), Enemy B: 3 HP (killable, 3 overkill)
    // Pick enemy A (least overkill)
    const state = makeSimState({
      energy: 3,
      enemies: [
        makeSimEnemy({ id: "e1", name: "Almost Dead", hp: 5, maxHp: 20 }),
        makeSimEnemy({ id: "e2", name: "Nearly Dead", hp: 3, maxHp: 20 }),
      ],
      hand: [
        makeSimCard({
          id: "c1",
          name: "Strike",
          description: "Deal 6 damage.",
        }),
      ],
    });

    const result = simulateCardPlay(state, "c1");
    expect(result?.target).toBe("Almost Dead");
    expect(state.enemies[0].hp).toBe(-1); // 5 - 6
  });

  it("damage card targets weakest enemy when none are killable", () => {
    // Card deals 6 damage. Neither enemy is killable.
    // Enemy A: 30 HP, Enemy B: 15 HP => targets weakest (B)
    const state = makeSimState({
      energy: 3,
      enemies: [
        makeSimEnemy({ id: "e1", name: "Tank", hp: 30, maxHp: 30 }),
        makeSimEnemy({ id: "e2", name: "Fighter", hp: 15, maxHp: 20 }),
      ],
      hand: [
        makeSimCard({
          id: "c1",
          name: "Strike",
          description: "Deal 6 damage.",
        }),
      ],
    });

    const result = simulateCardPlay(state, "c1");
    expect(result?.target).toBe("Fighter");
    expect(state.enemies[1].hp).toBe(9); // 15 - 6
    expect(state.enemies[0].hp).toBe(30); // Tank untouched
  });

  it("with only one enemy alive, targets that enemy", () => {
    const state = makeSimState({
      energy: 3,
      enemies: [
        makeSimEnemy({ id: "e1", name: "Dead", hp: 0, maxHp: 20 }),
        makeSimEnemy({ id: "e2", name: "Alive", hp: 15, maxHp: 20 }),
      ],
      hand: [
        makeSimCard({
          id: "c1",
          name: "Strike",
          description: "Deal 6 damage.",
        }),
      ],
    });

    const result = simulateCardPlay(state, "c1");
    expect(result?.target).toBe("Alive");
    expect(state.enemies[1].hp).toBe(9);
  });
});
