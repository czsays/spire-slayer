export type CardType = "attack" | "skill" | "power" | "status" | "curse";
export type PileLocation = "draw" | "hand" | "discard" | "exhaust";

/** Sentinel value for X-cost cards (spend all remaining energy) */
export const X_COST = -1;

export interface DeckCard {
  id: string;
  name: string;
  cost: number;
  type: CardType;
  description: string;
  upgraded: boolean;
  pile: PileLocation;
}

// Necrobinder starting deck + a few early pickups
export const sampleDeck: DeckCard[] = [
  // Hand (5 cards drawn)
  { id: "1", name: "Defend", cost: 1, type: "skill", description: "Gain 5 Block.", upgraded: false, pile: "hand" },
  { id: "2", name: "Defend", cost: 1, type: "skill", description: "Gain 5 Block.", upgraded: false, pile: "hand" },
  { id: "3", name: "Strike", cost: 1, type: "attack", description: "Deal 6 damage.", upgraded: false, pile: "hand" },
  { id: "4", name: "Defend", cost: 1, type: "skill", description: "Gain 5 Block.", upgraded: false, pile: "hand" },
  { id: "5", name: "Strike", cost: 1, type: "attack", description: "Deal 6 damage.", upgraded: false, pile: "hand" },

  // Draw pile (5 cards remaining)
  { id: "6", name: "Bodyguard", cost: 1, type: "skill", description: "Summon 5.", upgraded: false, pile: "draw" },
  { id: "7", name: "Blight Strike", cost: 1, type: "attack", description: "Deal 8 damage. Apply Doom equal to damage dealt.", upgraded: false, pile: "draw" },
  { id: "8", name: "Unleash", cost: 1, type: "attack", description: "Deal damage equal to Osty's Summon.", upgraded: false, pile: "draw" },
  { id: "9", name: "Afterlife", cost: 1, type: "skill", description: "Summon 6. Exhaust.", upgraded: false, pile: "draw" },
  { id: "10", name: "Defile", cost: 1, type: "attack", description: "Deal 7 damage. Apply 3 Doom.", upgraded: false, pile: "draw" },
];
