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

// Sample deck based on Slay the Spire 2 starter + some pickups
export const sampleDeck: DeckCard[] = [
  // Draw pile
  { id: "1", name: "Strike", cost: 1, type: "attack", description: "Deal 6 damage.", upgraded: false, pile: "draw" },
  { id: "2", name: "Strike", cost: 1, type: "attack", description: "Deal 6 damage.", upgraded: false, pile: "draw" },
  { id: "3", name: "Defend", cost: 1, type: "skill", description: "Gain 5 Block.", upgraded: false, pile: "draw" },
  { id: "4", name: "Bash", cost: 2, type: "attack", description: "Deal 8 damage. Apply 2 Vulnerable.", upgraded: false, pile: "draw" },
  { id: "5", name: "Inflame", cost: 1, type: "power", description: "Gain 2 Strength.", upgraded: false, pile: "draw" },
  { id: "6", name: "Pommel Strike", cost: 1, type: "attack", description: "Deal 9 damage. Draw 1 card.", upgraded: false, pile: "draw" },
  { id: "7", name: "Shrug It Off", cost: 1, type: "skill", description: "Gain 8 Block. Draw 1 card.", upgraded: false, pile: "draw" },
  { id: "8", name: "Carnage", cost: 2, type: "attack", description: "Ethereal. Deal 20 damage.", upgraded: false, pile: "draw" },

  // Hand
  { id: "9", name: "Rip and Tear", cost: 1, type: "attack", description: "Deal 7 damage to a random enemy twice.", upgraded: false, pile: "hand" },
  { id: "10", name: "White Noise", cost: 1, type: "skill", description: "Add a random Power to your hand.", upgraded: false, pile: "hand" },
  { id: "11", name: "Dualcast", cost: 1, type: "skill", description: "Evoke your next Orb twice.", upgraded: false, pile: "hand" },
  { id: "12", name: "Shadow Strike", cost: 1, type: "skill", description: "Deal 10 damage. If this kills, gain 1 energy.", upgraded: false, pile: "hand" },
  { id: "13", name: "Glasswork", cost: 1, type: "skill", description: "Gain 6 Block. Channel 1 Frost.", upgraded: false, pile: "hand" },

  // Discard pile
  { id: "14", name: "Strike", cost: 1, type: "attack", description: "Deal 6 damage.", upgraded: false, pile: "discard" },
  { id: "15", name: "Defend", cost: 1, type: "skill", description: "Gain 5 Block.", upgraded: false, pile: "discard" },
  { id: "16", name: "Defend", cost: 1, type: "skill", description: "Gain 5 Block.", upgraded: false, pile: "discard" },
  { id: "17", name: "Anger", cost: 0, type: "attack", description: "Deal 6 damage. Add a copy to discard.", upgraded: false, pile: "discard" },
  { id: "18", name: "Twin Strike", cost: 1, type: "attack", description: "Deal 5 damage twice.", upgraded: false, pile: "discard" },

  // Exhausted
  { id: "19", name: "Offering", cost: 0, type: "skill", description: "Lose 6 HP. Gain 2 Energy. Draw 3 cards.", upgraded: false, pile: "exhaust" },
  { id: "20", name: "True Grit+", cost: 1, type: "skill", description: "Gain 9 Block. Exhaust a card.", upgraded: true, pile: "exhaust" },
];
