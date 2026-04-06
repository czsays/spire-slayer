import { describe, it, expect } from "vitest";
import {
  simulateCardPlay,
  cloneSimState,
  createSimState,
  getPlayableCards,
  generateSequences,
} from "../simulator";
import { makeSimState, makeSimCard, makeSimEnemy, makePlayer } from "./fixtures";
import type { GameState } from "@/data/gameState";
import type { DeckCard } from "@/data/deckData";

// ─── calcDamage (tested via simulateCardPlay) ───────────────────

describe("calcDamage via simulateCardPlay", () => {
  it("deals base damage", () => {
    const state = makeSimState({
      enemies: [makeSimEnemy({ hp: 20 })],
      hand: [makeSimCard({ id: "c1", description: "Deal 6 damage." })],
    });
    simulateCardPlay(state, "c1");
    expect(state.enemies[0].hp).toBe(14);
  });

  it("adds strength modifier to damage", () => {
    const state = makeSimState({
      player: makePlayer({ strength: 3 }),
      enemies: [makeSimEnemy({ hp: 20 })],
      hand: [makeSimCard({ id: "c1", description: "Deal 6 damage." })],
    });
    simulateCardPlay(state, "c1");
    // 6 + 3 = 9 damage
    expect(state.enemies[0].hp).toBe(11);
  });

  it("applies weak multiplier (0.75)", () => {
    const state = makeSimState({
      player: makePlayer({ weak: 2 }),
      enemies: [makeSimEnemy({ hp: 20 })],
      hand: [makeSimCard({ id: "c1", description: "Deal 6 damage." })],
    });
    simulateCardPlay(state, "c1");
    // floor(6 * 0.75) = 4
    expect(state.enemies[0].hp).toBe(16);
  });

  it("applies vulnerable multiplier (1.5)", () => {
    const state = makeSimState({
      enemies: [makeSimEnemy({ hp: 20, vulnerable: 2 })],
      hand: [makeSimCard({ id: "c1", description: "Deal 6 damage." })],
    });
    simulateCardPlay(state, "c1");
    // floor(6 * 1.5) = 9
    expect(state.enemies[0].hp).toBe(11);
  });

  it("applies weak THEN vulnerable (weak-first ordering)", () => {
    const state = makeSimState({
      player: makePlayer({ weak: 1 }),
      enemies: [makeSimEnemy({ hp: 20, vulnerable: 1 })],
      hand: [makeSimCard({ id: "c1", description: "Deal 5 damage." })],
    });
    simulateCardPlay(state, "c1");
    // weak first: floor(5 * 0.75) = 3, then vulnerable: floor(3 * 1.5) = 4
    expect(state.enemies[0].hp).toBe(16);
  });

  it("clamps negative damage to zero (negative strength)", () => {
    const state = makeSimState({
      player: makePlayer({ strength: -10 }),
      enemies: [makeSimEnemy({ hp: 20 })],
      hand: [makeSimCard({ id: "c1", description: "Deal 6 damage." })],
    });
    simulateCardPlay(state, "c1");
    // 6 + (-10) = -4, clamped to 0
    expect(state.enemies[0].hp).toBe(20);
  });
});

// ─── calcBlock (tested via simulateCardPlay) ────────────────────

describe("calcBlock via simulateCardPlay", () => {
  it("gains base block", () => {
    const state = makeSimState({
      hand: [makeSimCard({ id: "c1", type: "skill", description: "Gain 5 Block." })],
    });
    simulateCardPlay(state, "c1");
    expect(state.playerBlock).toBe(5);
  });

  it("adds dexterity modifier to block", () => {
    const state = makeSimState({
      player: makePlayer({ dexterity: 2 }),
      hand: [makeSimCard({ id: "c1", type: "skill", description: "Gain 5 Block." })],
    });
    simulateCardPlay(state, "c1");
    // 5 + 2 = 7
    expect(state.playerBlock).toBe(7);
  });

  it("applies frail multiplier (0.75)", () => {
    const state = makeSimState({
      player: makePlayer({ frail: 2 }),
      hand: [makeSimCard({ id: "c1", type: "skill", description: "Gain 5 Block." })],
    });
    simulateCardPlay(state, "c1");
    // floor(5 * 0.75) = 3
    expect(state.playerBlock).toBe(3);
  });

  it("clamps negative block to zero (negative dexterity)", () => {
    const state = makeSimState({
      player: makePlayer({ dexterity: -10 }),
      hand: [makeSimCard({ id: "c1", type: "skill", description: "Gain 5 Block." })],
    });
    simulateCardPlay(state, "c1");
    // 5 + (-10) = -5, clamped to 0
    expect(state.playerBlock).toBe(0);
  });
});

// ─── dealDamageToEnemy (tested via simulateCardPlay) ────────────

describe("damage-to-enemy via simulateCardPlay", () => {
  it("full block absorption — no HP lost", () => {
    const state = makeSimState({
      enemies: [makeSimEnemy({ hp: 20, block: 10 })],
      hand: [makeSimCard({ id: "c1", description: "Deal 6 damage." })],
    });
    simulateCardPlay(state, "c1");
    expect(state.enemies[0].hp).toBe(20);
    expect(state.enemies[0].block).toBe(4); // 10 - 6
  });

  it("partial block — block breaks then HP lost", () => {
    const state = makeSimState({
      enemies: [makeSimEnemy({ hp: 20, block: 4 })],
      hand: [makeSimCard({ id: "c1", description: "Deal 6 damage." })],
    });
    simulateCardPlay(state, "c1");
    expect(state.enemies[0].block).toBe(0);
    expect(state.enemies[0].hp).toBe(18); // 20 - (6 - 4)
  });

  it("zero block — all damage goes to HP", () => {
    const state = makeSimState({
      enemies: [makeSimEnemy({ hp: 20, block: 0 })],
      hand: [makeSimCard({ id: "c1", description: "Deal 6 damage." })],
    });
    simulateCardPlay(state, "c1");
    expect(state.enemies[0].hp).toBe(14);
    expect(state.enemies[0].block).toBe(0);
  });
});

// ─── Multi-hit, AoE, debuffs, stat gains, draw, exhaust ────────

describe("simulateCardPlay — card effects", () => {
  it("handles multi-hit damage", () => {
    const state = makeSimState({
      enemies: [makeSimEnemy({ hp: 40 })],
      hand: [makeSimCard({ id: "c1", description: "Deal 5 damage 3 times." })],
    });
    simulateCardPlay(state, "c1");
    // 5 * 3 = 15
    expect(state.enemies[0].hp).toBe(25);
  });

  it("handles 'twice' multi-hit", () => {
    const state = makeSimState({
      enemies: [makeSimEnemy({ hp: 40 })],
      hand: [makeSimCard({ id: "c1", description: "Deal 5 damage twice." })],
    });
    simulateCardPlay(state, "c1");
    // 5 * 2 = 10
    expect(state.enemies[0].hp).toBe(30);
  });

  it("handles AoE damage to all enemies", () => {
    const state = makeSimState({
      enemies: [
        makeSimEnemy({ id: "e1", hp: 20 }),
        makeSimEnemy({ id: "e2", hp: 15 }),
      ],
      hand: [makeSimCard({ id: "c1", description: "Deal 8 damage to all enemies." })],
    });
    const result = simulateCardPlay(state, "c1");
    expect(state.enemies[0].hp).toBe(12);
    expect(state.enemies[1].hp).toBe(7);
    expect(result?.target).toBe("All Enemies");
  });

  it("applies vulnerable debuff", () => {
    const state = makeSimState({
      enemies: [makeSimEnemy({ id: "e1", hp: 20, vulnerable: 0 })],
      hand: [makeSimCard({ id: "c1", description: "Apply 2 Vulnerable." })],
    });
    simulateCardPlay(state, "c1");
    expect(state.enemies[0].vulnerable).toBe(2);
  });

  it("applies weak debuff", () => {
    const state = makeSimState({
      enemies: [makeSimEnemy({ id: "e1", hp: 20, weak: 0 })],
      hand: [makeSimCard({ id: "c1", description: "Apply 1 Weak." })],
    });
    simulateCardPlay(state, "c1");
    expect(state.enemies[0].weak).toBe(1);
  });

  it("gains strength", () => {
    const state = makeSimState({
      hand: [makeSimCard({ id: "c1", type: "power", description: "Gain 2 Strength." })],
    });
    simulateCardPlay(state, "c1");
    expect(state.player.strength).toBe(2);
  });

  it("gains dexterity", () => {
    const state = makeSimState({
      hand: [makeSimCard({ id: "c1", type: "power", description: "Gain 1 Dexterity." })],
    });
    simulateCardPlay(state, "c1");
    expect(state.player.dexterity).toBe(1);
  });

  it("draws cards from draw pile", () => {
    const state = makeSimState({
      hand: [makeSimCard({ id: "c1", type: "skill", description: "Draw 2 cards." })],
      drawPile: [
        makeSimCard({ id: "d1", name: "Card A" }),
        makeSimCard({ id: "d2", name: "Card B" }),
        makeSimCard({ id: "d3", name: "Card C" }),
      ],
    });
    simulateCardPlay(state, "c1");
    // 2 cards drawn from draw pile to hand
    expect(state.hand).toHaveLength(2);
    expect(state.drawPile).toHaveLength(1);
    expect(state.hand[0].id).toBe("d1");
    expect(state.hand[1].id).toBe("d2");
  });

  it("gains energy", () => {
    const state = makeSimState({
      energy: 3,
      hand: [makeSimCard({ id: "c1", type: "skill", cost: 0, description: "Gain 2 Energy." })],
    });
    simulateCardPlay(state, "c1");
    expect(state.energy).toBe(5); // 3 - 0 + 2
  });

  it("exhausts card instead of discarding", () => {
    const state = makeSimState({
      hand: [makeSimCard({ id: "c1", description: "Deal 6 damage. Exhaust." })],
    });
    simulateCardPlay(state, "c1");
    expect(state.discardPile).toHaveLength(0);
    expect(state.hand).toHaveLength(0);
  });

  it("moves non-exhaust cards to discard pile", () => {
    const state = makeSimState({
      hand: [makeSimCard({ id: "c1", description: "Deal 6 damage." })],
    });
    simulateCardPlay(state, "c1");
    expect(state.discardPile).toHaveLength(1);
    expect(state.discardPile[0].id).toBe("c1");
  });

  it("refuses to play cards that cost more than available energy", () => {
    const state = makeSimState({
      energy: 1,
      hand: [makeSimCard({ id: "c1", cost: 2, description: "Deal 6 damage." })],
    });
    const result = simulateCardPlay(state, "c1");
    expect(result).toBeNull();
    expect(state.enemies[0].hp).toBe(20);
    expect(state.energy).toBe(1);
  });

  it("returns null for card not in hand", () => {
    const state = makeSimState({ hand: [] });
    const result = simulateCardPlay(state, "nonexistent");
    expect(result).toBeNull();
  });
});

// ─── createSimState and cloneSimState ───────────────────────────

describe("createSimState", () => {
  it("partitions deck into hand, draw, and discard piles", () => {
    const gameState: GameState = {
      energy: 3,
      maxEnergy: 3,
      player: makePlayer(),
      enemies: [{ id: "e1", name: "Slime", hp: 10, maxHp: 10, block: 0, vulnerable: 0, weak: 0, strength: 0 }],
      relics: [],
    };
    const deck: DeckCard[] = [
      { id: "h1", name: "Strike", cost: 1, type: "attack", description: "Deal 6 damage.", upgraded: false, pile: "hand" },
      { id: "d1", name: "Defend", cost: 1, type: "skill", description: "Gain 5 Block.", upgraded: false, pile: "draw" },
      { id: "x1", name: "Bash", cost: 2, type: "attack", description: "Deal 8 damage.", upgraded: false, pile: "discard" },
    ];

    const sim = createSimState(gameState, deck);
    expect(sim.hand).toHaveLength(1);
    expect(sim.hand[0].id).toBe("h1");
    expect(sim.drawPile).toHaveLength(1);
    expect(sim.drawPile[0].id).toBe("d1");
    expect(sim.discardPile).toHaveLength(1);
    expect(sim.discardPile[0].id).toBe("x1");
    expect(sim.energy).toBe(3);
    expect(sim.enemies).toHaveLength(1);
  });
});

describe("cloneSimState", () => {
  it("creates a deep copy — mutations do not affect original", () => {
    const original = makeSimState();
    const clone = cloneSimState(original);

    // Mutate the clone
    clone.energy = 0;
    clone.player.strength = 99;
    clone.playerBlock = 50;
    clone.enemies[0].hp = 1;
    clone.hand[0].name = "Modified";
    clone.cardsPlayed.push("x");

    // Original is unaffected
    expect(original.energy).toBe(3);
    expect(original.player.strength).toBe(0);
    expect(original.playerBlock).toBe(0);
    expect(original.enemies[0].hp).toBe(20);
    expect(original.hand[0].name).toBe("Strike");
    expect(original.cardsPlayed).toHaveLength(0);
  });
});

// ─── generateSequences ──────────────────────────────────────────

describe("generateSequences", () => {
  it("generates correct permutations for two distinct cards", () => {
    const state = makeSimState({
      energy: 2,
      enemies: [makeSimEnemy({ hp: 50 })],
      hand: [
        makeSimCard({ id: "a", name: "Strike", cost: 1, description: "Deal 6 damage." }),
        makeSimCard({ id: "b", name: "Defend", cost: 1, type: "skill", description: "Gain 5 Block." }),
      ],
    });

    const seqs = generateSequences(state);
    const names = seqs.map((s) => s.cardNames.join(","));

    // Should have: Strike, Defend, Strike+Defend, Defend+Strike, and empty
    expect(names).toContain("Strike");
    expect(names).toContain("Defend");
    expect(names).toContain("Strike,Defend");
    expect(names).toContain("Defend,Strike");
    expect(names).toContain(""); // empty sequence
    expect(seqs).toHaveLength(5);
  });

  it("deduplicates same-name cards at same position", () => {
    const state = makeSimState({
      energy: 2,
      enemies: [makeSimEnemy({ hp: 50 })],
      hand: [
        makeSimCard({ id: "s1", name: "Strike", cost: 1, description: "Deal 6 damage." }),
        makeSimCard({ id: "s2", name: "Strike", cost: 1, description: "Deal 6 damage." }),
      ],
    });

    const seqs = generateSequences(state);
    // Two identical Strikes: only 1 single-card sequence + 1 double Strike + empty = 3
    expect(seqs).toHaveLength(3);
    const names = seqs.map((s) => s.cardNames.join(","));
    expect(names).toContain("Strike");
    expect(names).toContain("Strike,Strike");
    expect(names).toContain("");
  });

  it("enforces energy constraints", () => {
    const state = makeSimState({
      energy: 1,
      enemies: [makeSimEnemy({ hp: 50 })],
      hand: [
        makeSimCard({ id: "a", name: "Strike", cost: 1, description: "Deal 6 damage." }),
        makeSimCard({ id: "b", name: "Bash", cost: 2, description: "Deal 8 damage. Apply 2 Vulnerable." }),
      ],
    });

    const seqs = generateSequences(state);
    const names = seqs.map((s) => s.cardNames.join(","));
    expect(names).toContain("Strike");
    expect(names).not.toContain("Bash");
    expect(names).not.toContain("Strike,Bash");
    expect(names).toContain("");
  });

  it("always includes empty sequence", () => {
    const state = makeSimState({
      energy: 0,
      hand: [makeSimCard({ id: "a", cost: 1 })],
    });
    const seqs = generateSequences(state);
    expect(seqs).toHaveLength(1);
    expect(seqs[0].cardIds).toHaveLength(0);
  });

  it("respects maxSequences cap", () => {
    const state = makeSimState({
      energy: 10,
      enemies: [makeSimEnemy({ hp: 200 })],
      hand: [
        makeSimCard({ id: "a", name: "A", cost: 1, description: "Deal 1 damage." }),
        makeSimCard({ id: "b", name: "B", cost: 1, description: "Deal 1 damage." }),
        makeSimCard({ id: "c", name: "C", cost: 1, description: "Deal 1 damage." }),
        makeSimCard({ id: "d", name: "D", cost: 1, description: "Deal 1 damage." }),
        makeSimCard({ id: "e", name: "E", cost: 1, description: "Deal 1 damage." }),
      ],
    });

    const cap = 10;
    const seqs = generateSequences(state, cap);
    // Should not exceed cap + 1 (cap for backtracking + empty sequence appended after)
    expect(seqs.length).toBeLessThanOrEqual(cap + 1);
  });

  it("excludes status and curse cards from playable", () => {
    const state = makeSimState({
      energy: 3,
      hand: [
        makeSimCard({ id: "s", name: "Wound", cost: 0, type: "status", description: "Unplayable." }),
        makeSimCard({ id: "c", name: "Regret", cost: 0, type: "curse", description: "Unplayable." }),
        makeSimCard({ id: "a", name: "Strike", cost: 1, description: "Deal 6 damage." }),
      ],
    });

    const seqs = generateSequences(state);
    const allNames = seqs.flatMap((s) => s.cardNames);
    expect(allNames).not.toContain("Wound");
    expect(allNames).not.toContain("Regret");
    expect(allNames).toContain("Strike");
  });
});

// ─── getPlayableCards ───────────────────────────────────────────

describe("getPlayableCards", () => {
  it("returns cards with cost <= energy, excludes status/curse", () => {
    const state = makeSimState({
      energy: 1,
      hand: [
        makeSimCard({ id: "a", name: "Strike", cost: 1 }),
        makeSimCard({ id: "b", name: "Bash", cost: 2 }),
        makeSimCard({ id: "c", name: "Wound", cost: 0, type: "status" }),
      ],
    });
    const playable = getPlayableCards(state);
    expect(playable).toHaveLength(1);
    expect(playable[0].name).toBe("Strike");
  });
});
