import type { DeckCard, CardType } from "./deckData";
import type { GameState } from "./gameState";

// ── Turn effect summary ──────────────────────────────────────────

export interface CardPlay {
  cardName: string;
  cardType: CardType;
  cost: number;
  damage: number;
  block: number;
  buffs: string[];   // e.g. "Summon 5", "Apply 3 Doom"
  draws: number;
}

export interface TurnPlan {
  id: string;
  cards: CardPlay[];
  totalEnergy: number;
  totalDamage: number;
  totalBlock: number;
  allBuffs: string[];
  totalDraws: number;
  label: string;       // short description like "All-out Attack"
}

// ── Parse a single card into its play effects ────────────────────

const VULNERABLE_MULT = 1.5;
const WEAK_MULT = 0.75;

function simulateCardPlay(card: DeckCard, state: GameState): CardPlay {
  let damage = 0;
  let block = 0;
  const buffs: string[] = [];
  let draws = 0;

  const desc = card.description;

  // Damage
  const dmgMatch = desc.match(/Deal (\d+) damage/i);
  if (dmgMatch) {
    let dmg = parseInt(dmgMatch[1]) + state.player.strength;
    if (state.player.weak > 0) dmg = Math.floor(dmg * WEAK_MULT);
    const anyVuln = state.enemies.some((e) => e.vulnerable > 0);
    if (anyVuln) dmg = Math.floor(dmg * VULNERABLE_MULT);
    damage = Math.max(0, dmg);

    const timesMatch = desc.match(/(\d+) times|twice/i);
    const hits = timesMatch ? (timesMatch[0] === "twice" ? 2 : parseInt(timesMatch[1])) : 1;
    damage *= hits;
  }

  // Block
  const blockMatch = desc.match(/Gain (\d+) Block/i);
  if (blockMatch) {
    let blk = parseInt(blockMatch[1]) + state.player.dexterity;
    if (state.player.frail > 0) blk = Math.floor(blk * 0.75);
    block = Math.max(0, blk);
  }

  // Summon
  const summonMatch = desc.match(/Summon (\d+)/i);
  if (summonMatch) buffs.push(`Summon ${summonMatch[1]}`);

  // Apply debuffs
  const applyMatch = desc.match(/Apply (\d+) (\w+)/i);
  if (applyMatch) buffs.push(`Apply ${applyMatch[1]} ${applyMatch[2]}`);

  // Apply Doom equal to damage dealt
  if (/Apply Doom equal to damage dealt/i.test(desc)) {
    buffs.push(`Apply ${damage} Doom`);
  }

  // Draw
  const drawMatch = desc.match(/Draw (\d+) card/i);
  if (drawMatch) draws = parseInt(drawMatch[1]);

  // Gain Strength
  const strMatch = desc.match(/Gain (\d+) Strength/i);
  if (strMatch) buffs.push(`+${strMatch[1]} Strength`);

  // Gain Energy
  const energyMatch = desc.match(/Gain (\d+) Energy/i);
  if (energyMatch) buffs.push(`+${energyMatch[1]} Energy`);

  // Exhaust
  if (/Exhaust/i.test(desc) && !/Exhaust a/i.test(desc)) {
    buffs.push("Exhaust");
  }

  // Special: Unleash (damage equal to Osty's Summon — unknown, mark it)
  if (/damage equal to Osty/i.test(desc)) {
    damage = 0; // can't compute without Osty state
    buffs.push("Damage = Osty's Summon");
  }

  return { cardName: card.name, cardType: card.type, cost: card.cost, damage, block, buffs, draws };
}

// ── Generate unique card combinations within energy ──────────────

function getCombinations(handCards: DeckCard[], maxEnergy: number): DeckCard[][] {
  const results: DeckCard[][] = [];

  function recurse(start: number, current: DeckCard[], energyLeft: number) {
    if (current.length > 0) {
      results.push([...current]);
    }
    for (let i = start; i < handCards.length; i++) {
      if (handCards[i].cost <= energyLeft) {
        current.push(handCards[i]);
        recurse(i + 1, current, energyLeft - handCards[i].cost);
        current.pop();
      }
    }
  }

  recurse(0, [], maxEnergy);
  return results;
}

// ── Score and label a turn plan ──────────────────────────────────

function labelTurn(plan: TurnPlan): string {
  if (plan.totalDamage > 0 && plan.totalBlock === 0) return "All-out Attack";
  if (plan.totalBlock > 0 && plan.totalDamage === 0) return "Full Defense";
  if (plan.totalDamage > 0 && plan.totalBlock > 0) return "Balanced";
  if (plan.allBuffs.length > 0 && plan.totalDamage === 0 && plan.totalBlock === 0) return "Setup";
  return "Utility";
}

function scoreTurn(plan: TurnPlan): number {
  // Prefer plans that use more energy, deal more damage, and have more variety
  return plan.totalEnergy * 10 + plan.totalDamage * 2 + plan.totalBlock * 1.5 + plan.totalDraws * 3 + plan.allBuffs.length * 2;
}

// ── Main API ─────────────────────────────────────────────────────

export function generateTurnPlans(deck: DeckCard[], state: GameState): TurnPlan[] {
  const handCards = deck.filter((c) => c.pile === "hand");
  const combos = getCombinations(handCards, state.energy);

  // Deduplicate by card name set (since we might have duplicate card instances)
  const seen = new Set<string>();
  const uniqueCombos: DeckCard[][] = [];
  for (const combo of combos) {
    const key = combo.map((c) => c.id).sort().join(",");
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCombos.push(combo);
    }
  }

  // Build turn plans
  const plans: TurnPlan[] = uniqueCombos.map((combo, idx) => {
    const cards = combo.map((c) => simulateCardPlay(c, state));
    const totalEnergy = cards.reduce((s, c) => s + c.cost, 0);
    const totalDamage = cards.reduce((s, c) => s + c.damage, 0);
    const totalBlock = cards.reduce((s, c) => s + c.block, 0);
    const allBuffs = cards.flatMap((c) => c.buffs);
    const totalDraws = cards.reduce((s, c) => s + c.draws, 0);

    const plan: TurnPlan = {
      id: `turn-${idx}`,
      cards,
      totalEnergy,
      totalDamage,
      totalBlock,
      allBuffs,
      totalDraws,
      label: "",
    };
    plan.label = labelTurn(plan);
    return plan;
  });

  // Sort by score descending, pick diverse top plans
  plans.sort((a, b) => scoreTurn(b) - scoreTurn(a));

  // Try to pick plans with different labels for variety
  const picked: TurnPlan[] = [];
  const labelsSeen = new Set<string>();

  // First pass: one of each label
  for (const p of plans) {
    if (!labelsSeen.has(p.label)) {
      labelsSeen.add(p.label);
      picked.push(p);
    }
  }

  // Second pass: fill remaining slots by score
  for (const p of plans) {
    if (!picked.includes(p)) {
      picked.push(p);
    }
  }

  return picked;
}
