import { useMemo } from "react";
import type { DeckCard, CardType } from "@/data/deckData";
import { X_COST } from "@/data/deckData";

export interface DeckSummaryData {
  totalCards: number;
  attacks: number;
  skills: number;
  powers: number;
  curses: number;
  statuses: number;
  averageCost: number;
}

/** Pure derivation: compute deck composition from a card list, ignoring pile locations. */
export function computeDeckSummary(deck: DeckCard[]): DeckSummaryData {
  let attacks = 0;
  let skills = 0;
  let powers = 0;
  let curses = 0;
  let statuses = 0;
  let costSum = 0;
  let costCount = 0;

  for (const card of deck) {
    switch (card.type) {
      case "attack":
        attacks++;
        break;
      case "skill":
        skills++;
        break;
      case "power":
        powers++;
        break;
      case "curse":
        curses++;
        break;
      case "status":
        statuses++;
        break;
    }
    // Exclude X-cost and unplayable (curse/status) cards from average cost
    if (card.cost !== X_COST && card.type !== "curse" && card.type !== "status") {
      costSum += card.cost;
      costCount++;
    }
  }

  return {
    totalCards: deck.length,
    attacks,
    skills,
    powers,
    curses,
    statuses,
    averageCost: costCount > 0 ? Math.round((costSum / costCount) * 10) / 10 : 0,
  };
}

/** React hook wrapper — memoizes deck summary from the deck array. */
export function useDeckSummary(deck: DeckCard[]): DeckSummaryData {
  return useMemo(() => computeDeckSummary(deck), [deck]);
}
