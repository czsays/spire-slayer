import { describe, it, expect } from "vitest";
import { scoreState, EnemyIntentInfo } from "../scorer";
import { simulateCardPlay, cloneSimState } from "../simulator";
import { DEFAULT_WEIGHTS } from "../types";
import { makeSimState, makeSimCard, makeSimEnemy, makePlayer } from "./fixtures";

// Helper: play cards and score the result
function playAndScore(
  state: ReturnType<typeof makeSimState>,
  cardIds: string[],
  enemyIntentMap = new Map<string, EnemyIntentInfo>()
) {
  const before = cloneSimState(state);
  for (const id of cardIds) {
    simulateCardPlay(state, id);
  }
  return scoreState(before, state, 0, DEFAULT_WEIGHTS, enemyIntentMap);
}

// ─── Scoring priority ordering ──────────────────────────────────

describe("scoreState priority ordering", () => {
  it("lethal scores higher than kill (non-lethal)", () => {
    // Lethal: kill the only enemy
    const lethalState = makeSimState({
      energy: 3,
      enemies: [makeSimEnemy({ id: "e1", hp: 6, maxHp: 20 })],
      hand: [makeSimCard({ id: "c1", description: "Deal 6 damage." })],
    });
    const lethalResult = playAndScore(lethalState, ["c1"]);

    // Non-lethal kill: kill one of two enemies
    const killState = makeSimState({
      energy: 3,
      enemies: [
        makeSimEnemy({ id: "e1", hp: 6, maxHp: 20 }),
        makeSimEnemy({ id: "e2", hp: 50, maxHp: 50 }),
      ],
      hand: [makeSimCard({ id: "c1", description: "Deal 6 damage." })],
    });
    const killResult = playAndScore(killState, ["c1"]);

    expect(lethalResult.score).toBeGreaterThan(killResult.score);
    expect(lethalResult.tags).toContain("LETHAL!");
  });

  it("kill scores higher than damage-only", () => {
    // Kill: exactly lethal on one of two enemies
    const killState = makeSimState({
      energy: 3,
      enemies: [
        makeSimEnemy({ id: "e1", hp: 6, maxHp: 20 }),
        makeSimEnemy({ id: "e2", hp: 50, maxHp: 50 }),
      ],
      hand: [makeSimCard({ id: "c1", description: "Deal 6 damage." })],
    });
    const killResult = playAndScore(killState, ["c1"]);

    // Damage-only: same damage but does not kill
    const dmgState = makeSimState({
      energy: 3,
      enemies: [
        makeSimEnemy({ id: "e1", hp: 40, maxHp: 40 }),
        makeSimEnemy({ id: "e2", hp: 50, maxHp: 50 }),
      ],
      hand: [makeSimCard({ id: "c1", description: "Deal 6 damage." })],
    });
    const dmgResult = playAndScore(dmgState, ["c1"]);

    expect(killResult.score).toBeGreaterThan(dmgResult.score);
  });

  it("damage+block scores higher than damage-only when enemies attack", () => {
    const intentMap = new Map<string, EnemyIntentInfo>([
      ["e1", { damage: 10, debuffs: [], isBuff: false, isAttacking: true }],
    ]);

    // Damage + block
    const bothState = makeSimState({
      energy: 3,
      enemies: [makeSimEnemy({ id: "e1", hp: 40, maxHp: 40 })],
      hand: [
        makeSimCard({ id: "c1", description: "Deal 6 damage." }),
        makeSimCard({ id: "c2", type: "skill", description: "Gain 5 Block." }),
      ],
    });
    const bothResult = playAndScore(bothState, ["c1", "c2"], intentMap);

    // Damage only
    const dmgState = makeSimState({
      energy: 3,
      enemies: [makeSimEnemy({ id: "e1", hp: 40, maxHp: 40 })],
      hand: [makeSimCard({ id: "c1", description: "Deal 6 damage." })],
    });
    const dmgResult = playAndScore(dmgState, ["c1"], intentMap);

    expect(bothResult.score).toBeGreaterThan(dmgResult.score);
  });
});

// ─── Survival scoring ───────────────────────────────────────────

describe("scoreState survival scoring", () => {
  it("values full block when enemy attacks", () => {
    const intentMap = new Map<string, EnemyIntentInfo>([
      ["e1", { damage: 5, debuffs: [], isBuff: false, isAttacking: true }],
    ]);

    const state = makeSimState({
      energy: 3,
      enemies: [makeSimEnemy({ id: "e1", hp: 40, maxHp: 40 })],
      hand: [makeSimCard({ id: "c1", type: "skill", description: "Gain 5 Block." })],
    });

    const result = playAndScore(state, ["c1"], intentMap);
    expect(result.totalBlock).toBe(5);
    expect(result.unblockedDamage).toBe(0);
    expect(result.reasoning.some((r) => r.includes("Blocks all"))).toBe(true);
  });

  it("reports partial block correctly", () => {
    const intentMap = new Map<string, EnemyIntentInfo>([
      ["e1", { damage: 10, debuffs: [], isBuff: false, isAttacking: true }],
    ]);

    const state = makeSimState({
      energy: 3,
      enemies: [makeSimEnemy({ id: "e1", hp: 40, maxHp: 40 })],
      hand: [makeSimCard({ id: "c1", type: "skill", description: "Gain 5 Block." })],
    });

    const result = playAndScore(state, ["c1"], intentMap);
    expect(result.totalBlock).toBe(5);
    expect(result.unblockedDamage).toBe(5);
    expect(result.reasoning.some((r) => r.includes("5/10"))).toBe(true);
  });

  it("killing an enemy avoids its incoming damage", () => {
    const intentMap = new Map<string, EnemyIntentInfo>([
      ["e1", { damage: 15, debuffs: [], isBuff: false, isAttacking: true }],
      ["e2", { damage: 10, debuffs: [], isBuff: false, isAttacking: true }],
    ]);

    const state = makeSimState({
      energy: 3,
      enemies: [
        makeSimEnemy({ id: "e1", hp: 6, maxHp: 20 }),
        makeSimEnemy({ id: "e2", hp: 50, maxHp: 50 }),
      ],
      hand: [makeSimCard({ id: "c1", description: "Deal 6 damage." })],
    });

    const result = playAndScore(state, ["c1"], intentMap);
    expect(result.enemiesKilled).toBe(1);
    // Reasoning should mention avoiding damage
    expect(result.reasoning.some((r) => r.includes("avoids") || r.includes("Avoids"))).toBe(true);
  });
});

// ─── Setup scoring ──────────────────────────────────────────────

describe("scoreState setup scoring", () => {
  it("values vulnerability applied to surviving enemies", () => {
    const state = makeSimState({
      energy: 3,
      enemies: [makeSimEnemy({ id: "e1", hp: 40, maxHp: 40, vulnerable: 0 })],
      hand: [makeSimCard({ id: "c1", description: "Apply 2 Vulnerable." })],
      // Add attack cards to draw/discard so attackRatio > 0
      drawPile: [
        makeSimCard({ id: "d1", name: "Strike", type: "attack", description: "Deal 6 damage." }),
        makeSimCard({ id: "d2", name: "Strike", type: "attack", description: "Deal 6 damage." }),
      ],
    });

    const result = playAndScore(state, ["c1"]);
    expect(result.tags).toContain("Setup");
    expect(result.reasoning.some((r) => r.includes("Vulnerable"))).toBe(true);
  });

  it("values weakness applied", () => {
    const state = makeSimState({
      energy: 3,
      enemies: [makeSimEnemy({ id: "e1", hp: 40, maxHp: 40, weak: 0 })],
      hand: [makeSimCard({ id: "c1", description: "Apply 2 Weak." })],
    });

    const result = playAndScore(state, ["c1"]);
    expect(result.tags).toContain("Setup");
    expect(result.reasoning.some((r) => r.includes("Weak"))).toBe(true);
  });

  it("values strength gain", () => {
    const state = makeSimState({
      energy: 3,
      enemies: [makeSimEnemy({ id: "e1", hp: 40, maxHp: 40 })],
      hand: [makeSimCard({ id: "c1", type: "power", description: "Gain 2 Strength." })],
      drawPile: [
        makeSimCard({ id: "d1", type: "attack", description: "Deal 6 damage." }),
      ],
    });

    const result = playAndScore(state, ["c1"]);
    expect(result.tags).toContain("Setup");
    expect(result.reasoning.some((r) => r.includes("Strength"))).toBe(true);
  });

  it("values dexterity gain", () => {
    const state = makeSimState({
      energy: 3,
      enemies: [makeSimEnemy({ id: "e1", hp: 40, maxHp: 40 })],
      hand: [makeSimCard({ id: "c1", type: "power", description: "Gain 1 Dexterity." })],
      drawPile: [
        makeSimCard({ id: "d1", type: "skill", description: "Gain 5 Block." }),
      ],
    });

    const result = playAndScore(state, ["c1"]);
    expect(result.tags).toContain("Setup");
    expect(result.reasoning.some((r) => r.includes("Dexterity"))).toBe(true);
  });
});

// ─── Result tags ────────────────────────────────────────────────

describe("scoreState result tags", () => {
  it("tags LETHAL when all enemies killed", () => {
    const state = makeSimState({
      energy: 3,
      enemies: [makeSimEnemy({ id: "e1", hp: 6, maxHp: 20 })],
      hand: [makeSimCard({ id: "c1", description: "Deal 6 damage." })],
    });
    const result = playAndScore(state, ["c1"]);
    expect(result.tags).toContain("LETHAL!");
  });

  it("tags Aggressive when damage dominates block", () => {
    const state = makeSimState({
      energy: 3,
      enemies: [
        makeSimEnemy({ id: "e1", hp: 40, maxHp: 40 }),
        makeSimEnemy({ id: "e2", hp: 40, maxHp: 40 }),
      ],
      hand: [makeSimCard({ id: "c1", description: "Deal 6 damage." })],
    });
    const result = playAndScore(state, ["c1"]);
    expect(result.tags).toContain("Aggressive");
  });

  it("tags Defensive when block dominates damage", () => {
    const state = makeSimState({
      energy: 3,
      enemies: [makeSimEnemy({ id: "e1", hp: 40, maxHp: 40 })],
      hand: [makeSimCard({ id: "c1", type: "skill", description: "Gain 5 Block." })],
    });
    const result = playAndScore(state, ["c1"]);
    expect(result.tags).toContain("Defensive");
  });

  it("tags Balanced when damage and block are comparable", () => {
    const state = makeSimState({
      energy: 3,
      enemies: [makeSimEnemy({ id: "e1", hp: 40, maxHp: 40 })],
      hand: [
        makeSimCard({ id: "c1", description: "Deal 6 damage." }),
        makeSimCard({ id: "c2", type: "skill", description: "Gain 6 Block." }),
      ],
    });
    const result = playAndScore(state, ["c1", "c2"]);
    expect(result.tags).toContain("Balanced");
  });
});

// ─── Penalty for doing nothing ──────────────────────────────────

describe("scoreState empty sequence penalty", () => {
  it("penalizes playing no cards", () => {
    const before = makeSimState({ energy: 3 });
    const after = cloneSimState(before);
    const result = scoreState(before, after, 0, DEFAULT_WEIGHTS);
    expect(result.score).toBeLessThan(0);
  });
});
