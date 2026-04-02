export type CardType = "attack" | "skill" | "power" | "status" | "curse";
export type PileLocation = "draw" | "hand" | "discard" | "exhaust";

export interface DeckCard {
  id: string;
  name: string;
  cost: number;
  type: CardType;
  description: string;
  upgraded: boolean;
  pile: PileLocation;
}

// Silent-style deck matching the new screenshot (Turn 1)
export const sampleDeck: DeckCard[] = [
  // Hand (visible in screenshot: Defend, Defend, Strike, Defend, Strike)
  { id: "1", name: "Defend", cost: 1, type: "skill", description: "Gain 5 Block.", upgraded: false, pile: "hand" },
  { id: "2", name: "Defend", cost: 1, type: "skill", description: "Gain 5 Block.", upgraded: false, pile: "hand" },
  { id: "3", name: "Strike", cost: 1, type: "attack", description: "Deal 6 damage.", upgraded: false, pile: "hand" },
  { id: "4", name: "Defend", cost: 1, type: "skill", description: "Gain 5 Block.", upgraded: false, pile: "hand" },
  { id: "5", name: "Strike", cost: 1, type: "attack", description: "Deal 6 damage.", upgraded: false, pile: "hand" },

  // Draw pile
  { id: "6", name: "Strike", cost: 1, type: "attack", description: "Deal 6 damage.", upgraded: false, pile: "draw" },
  { id: "7", name: "Strike", cost: 1, type: "attack", description: "Deal 6 damage.", upgraded: false, pile: "draw" },
  { id: "8", name: "Defend", cost: 1, type: "skill", description: "Gain 5 Block.", upgraded: false, pile: "draw" },
  { id: "9", name: "Neutralize", cost: 0, type: "attack", description: "Deal 3 damage. Apply 1 Weak.", upgraded: false, pile: "draw" },
  { id: "10", name: "Survivor", cost: 1, type: "skill", description: "Gain 8 Block. Discard 1 card.", upgraded: false, pile: "draw" },
  { id: "11", name: "Backstab", cost: 0, type: "attack", description: "Innate. Deal 11 damage. Exhaust.", upgraded: false, pile: "draw" },
  { id: "12", name: "Deadly Poison", cost: 1, type: "skill", description: "Apply 5 Poison.", upgraded: false, pile: "draw" },
  { id: "13", name: "Blade Dance", cost: 1, type: "skill", description: "Add 3 Shivs to your hand.", upgraded: false, pile: "draw" },
  { id: "14", name: "Acrobatics", cost: 1, type: "skill", description: "Draw 3 cards. Discard 1 card.", upgraded: false, pile: "draw" },
  { id: "15", name: "Dash", cost: 2, type: "attack", description: "Deal 10 damage. Gain 10 Block.", upgraded: false, pile: "draw" },
];
