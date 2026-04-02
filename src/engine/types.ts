import type { DeckCard } from "@/data/deckData";
import type { GameState, EnemyState, BuffState } from "@/data/gameState";

/** Mutable copy of game state for simulation */
export interface SimState {
  energy: number;
  player: BuffState;
  playerBlock: number;
  enemies: SimEnemy[];
  hand: SimCard[];
  drawPile: SimCard[];
  discardPile: SimCard[];
  cardsPlayed: string[]; // ids of cards played this sequence
}

export interface SimCard {
  id: string;
  name: string;
  cost: number;
  type: DeckCard["type"];
  description: string;
  upgraded: boolean;
}

export interface SimEnemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  block: number;
  vulnerable: number;
  weak: number;
  strength: number;
}

/** Target info for a card play */
export interface CardPlayTarget {
  cardName: string;
  target: string | null; // enemy name, "All Enemies", or null for self-target
}

/** A sequence of card plays to evaluate */
export interface PlaySequence {
  cardIds: string[];
  cardNames: string[];
  targets: CardPlayTarget[];
}

/** Result of scoring a play sequence */
export interface Recommendation {
  sequence: PlaySequence;
  score: number;
  reasoning: string[];
  tags: string[]; // "LETHAL!", "Defensive", "Setup", "Efficient"
  totalDamage: number;
  totalBlock: number;
  enemiesKilled: number;
  incomingDamage: number;     // total damage enemies intend to deal
  unblockedDamage: number;    // damage that gets through after block
  incomingDebuffs: string[];  // debuffs enemies intend to apply
}

/** Weights for the scoring function */
export interface ScoringWeights {
  lethal: number;
  kill: number;
  damage: number;
  survival: number;
  setup: number;
  efficiency: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  lethal: 100000,
  kill: 10000,
  damage: 8,
  survival: 25,
  setup: 8,
  efficiency: 3,
};
