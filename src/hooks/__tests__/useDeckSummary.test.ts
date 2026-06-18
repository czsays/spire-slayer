import { describe, it, expect } from "vitest";
import { computeDeckSummary } from "../useDeckSummary";
import type { DeckCard } from "@/data/deckData";
import { X_COST } from "@/data/deckData";

function makeCard(overrides: Partial<DeckCard> = {}): DeckCard {
  return {
    id: "c1",
    name: "Strike",
    cost: 1,
    type: "attack",
    description: "Deal 6 damage.",
    upgraded: false,
    pile: "draw",
    ...overrides,
  };
}

describe("computeDeckSummary", () => {
  it("counts card types correctly", () => {
    const deck: DeckCard[] = [
      makeCard({ id: "1", type: "attack" }),
      makeCard({ id: "2", type: "attack" }),
      makeCard({ id: "3", type: "skill" }),
      makeCard({ id: "4", type: "power" }),
      makeCard({ id: "5", type: "curse", cost: 0 }),
      makeCard({ id: "6", type: "status", cost: 0 }),
    ];

    const summary = computeDeckSummary(deck);
    expect(summary.totalCards).toBe(6);
    expect(summary.attacks).toBe(2);
    expect(summary.skills).toBe(1);
    expect(summary.powers).toBe(1);
    expect(summary.curses).toBe(1);
    expect(summary.statuses).toBe(1);
  });

  it("computes average cost excluding X-cost, curses, and statuses", () => {
    const deck: DeckCard[] = [
      makeCard({ id: "1", type: "attack", cost: 1 }),
      makeCard({ id: "2", type: "attack", cost: 2 }),
      makeCard({ id: "3", type: "skill", cost: 0 }),
      makeCard({ id: "4", type: "curse", cost: 0 }),      // excluded
      makeCard({ id: "5", type: "status", cost: 0 }),      // excluded
      makeCard({ id: "6", type: "attack", cost: X_COST }), // excluded
    ];

    const summary = computeDeckSummary(deck);
    // avg of (1 + 2 + 0) / 3 = 1.0
    expect(summary.averageCost).toBe(1);
  });

  it("returns zero average cost for an empty deck", () => {
    const summary = computeDeckSummary([]);
    expect(summary.totalCards).toBe(0);
    expect(summary.averageCost).toBe(0);
  });

  it("rounds average cost to one decimal place", () => {
    const deck: DeckCard[] = [
      makeCard({ id: "1", cost: 1 }),
      makeCard({ id: "2", cost: 1 }),
      makeCard({ id: "3", cost: 2 }),
    ];

    const summary = computeDeckSummary(deck);
    // avg = (1 + 1 + 2) / 3 = 1.333... → rounded to 1.3
    expect(summary.averageCost).toBe(1.3);
  });

  it("handles deck with only curses and statuses (no playable cards for avg)", () => {
    const deck: DeckCard[] = [
      makeCard({ id: "1", type: "curse", cost: 0 }),
      makeCard({ id: "2", type: "status", cost: 0 }),
    ];

    const summary = computeDeckSummary(deck);
    expect(summary.totalCards).toBe(2);
    expect(summary.averageCost).toBe(0);
    expect(summary.curses).toBe(1);
    expect(summary.statuses).toBe(1);
  });

  it("ignores pile location — all cards count regardless of pile", () => {
    const deck: DeckCard[] = [
      makeCard({ id: "1", pile: "hand" }),
      makeCard({ id: "2", pile: "draw" }),
      makeCard({ id: "3", pile: "discard" }),
      makeCard({ id: "4", pile: "exhaust" }),
    ];

    const summary = computeDeckSummary(deck);
    expect(summary.totalCards).toBe(4);
    expect(summary.attacks).toBe(4);
  });
});
