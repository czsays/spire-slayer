import type { SimState, SimCard, SimEnemy } from "../types";
import type { BuffState, EnemyState } from "@/data/gameState";

/** Create a default BuffState with all zeros */
export function makePlayer(overrides: Partial<BuffState> = {}): BuffState {
  return {
    strength: 0,
    dexterity: 0,
    focus: 0,
    vulnerable: 0,
    weak: 0,
    frail: 0,
    ritual: 0,
    vigor: 0,
    platedArmor: 0,
    metallicize: 0,
    ...overrides,
  };
}

/** Create a default SimEnemy */
export function makeSimEnemy(overrides: Partial<SimEnemy> = {}): SimEnemy {
  return {
    id: "enemy-1",
    name: "Test Enemy",
    hp: 20,
    maxHp: 20,
    block: 0,
    vulnerable: 0,
    weak: 0,
    strength: 0,
    ...overrides,
  };
}

/** Create a default SimCard */
export function makeSimCard(overrides: Partial<SimCard> = {}): SimCard {
  return {
    id: "card-1",
    name: "Strike",
    cost: 1,
    type: "attack",
    description: "Deal 6 damage.",
    upgraded: false,
    ...overrides,
  };
}

/** Create a default EnemyState (for enemyIntents tests) */
export function makeEnemy(overrides: Partial<EnemyState> = {}): EnemyState {
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

/** Create a minimal valid SimState */
export function makeSimState(overrides: Partial<SimState> = {}): SimState {
  return {
    energy: 3,
    player: makePlayer(),
    playerBlock: 0,
    enemies: [makeSimEnemy()],
    hand: [
      makeSimCard({ id: "card-1", name: "Strike", description: "Deal 6 damage." }),
      makeSimCard({ id: "card-2", name: "Defend", cost: 1, type: "skill", description: "Gain 5 Block." }),
    ],
    drawPile: [],
    discardPile: [],
    cardsPlayed: [],
    ...overrides,
  };
}
