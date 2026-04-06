import { describe, it, expect } from "vitest";
import { estimateEnemyDamage } from "../enemyIntents";
import type { EnemyState } from "@/data/gameState";

function makeEnemy(overrides: Partial<EnemyState> = {}): EnemyState {
  return {
    id: "e1",
    name: "Unknown",
    hp: 20,
    maxHp: 20,
    block: 0,
    vulnerable: 0,
    weak: 0,
    strength: 0,
    ...overrides,
  };
}

// ─── Known enemy patterns ───────────────────────────────────────

describe("estimateEnemyDamage — known enemies", () => {
  it("Jaw Worm returns 11 + strength", () => {
    expect(estimateEnemyDamage(makeEnemy({ name: "Jaw Worm", strength: 0 }))).toBe(11);
    expect(estimateEnemyDamage(makeEnemy({ name: "Jaw Worm", strength: 3 }))).toBe(14);
  });

  it("Nob returns 16 + strength", () => {
    expect(estimateEnemyDamage(makeEnemy({ name: "Nob", strength: 0 }))).toBe(16);
    expect(estimateEnemyDamage(makeEnemy({ name: "Nob", strength: 2 }))).toBe(18);
  });

  it("Gremlin Nob returns 16 + strength (nob checked before gremlin)", () => {
    expect(estimateEnemyDamage(makeEnemy({ name: "Gremlin Nob", strength: 0 }))).toBe(16);
    expect(estimateEnemyDamage(makeEnemy({ name: "Gremlin Nob", strength: 3 }))).toBe(19);
  });

  it("Cultist returns 6 + strength", () => {
    expect(estimateEnemyDamage(makeEnemy({ name: "Cultist", strength: 0 }))).toBe(6);
    expect(estimateEnemyDamage(makeEnemy({ name: "Cultist", strength: 5 }))).toBe(11);
  });

  it("Louse returns 6 + strength", () => {
    expect(estimateEnemyDamage(makeEnemy({ name: "Red Louse", strength: 0 }))).toBe(6);
  });

  it("Acid Slime returns 8 + strength", () => {
    expect(estimateEnemyDamage(makeEnemy({ name: "Acid Slime (M)", strength: 0 }))).toBe(8);
  });

  it("Lagavulin returns 18 + strength", () => {
    expect(estimateEnemyDamage(makeEnemy({ name: "Lagavulin", strength: 0 }))).toBe(18);
  });

  it("Slime Boss returns 35 + strength", () => {
    expect(estimateEnemyDamage(makeEnemy({ name: "Slime Boss", strength: 0 }))).toBe(35);
  });
});

// ─── Unknown enemy fallback ─────────────────────────────────────

describe("estimateEnemyDamage — unknown enemies", () => {
  it("returns 7 + strength for unknown enemy name", () => {
    expect(estimateEnemyDamage(makeEnemy({ name: "Mystery Monster", strength: 0 }))).toBe(7);
    expect(estimateEnemyDamage(makeEnemy({ name: "Mystery Monster", strength: 4 }))).toBe(11);
  });
});

// ─── Dead enemies ───────────────────────────────────────────────

describe("estimateEnemyDamage — edge cases", () => {
  it("still returns a value for dead enemies (caller is responsible for filtering)", () => {
    // estimateEnemyDamage itself does not check HP — that's estimateIncomingDamage's job
    const result = estimateEnemyDamage(makeEnemy({ name: "Cultist", hp: 0, strength: 0 }));
    expect(result).toBe(6);
  });
});
