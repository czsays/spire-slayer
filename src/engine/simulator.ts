import type { DeckCard } from "@/data/deckData";
import type { GameState } from "@/data/gameState";
import type { SimState, SimCard, SimEnemy, CardPlayTarget, PlaySequence } from "./types";

const VULNERABLE_MULT = 1.5;
const WEAK_MULT = 0.75;
const FRAIL_MULT = 0.75;

/** Create a mutable simulation state from the current game state + deck */
export function createSimState(gameState: GameState, deck: DeckCard[]): SimState {
  const hand = deck
    .filter((c) => c.pile === "hand")
    .map(toSimCard);

  const drawPile = deck
    .filter((c) => c.pile === "draw")
    .map(toSimCard);

  const discardPile = deck
    .filter((c) => c.pile === "discard")
    .map(toSimCard);

  return {
    energy: gameState.energy,
    player: { ...gameState.player },
    playerBlock: 0,
    enemies: gameState.enemies.map((e) => ({ ...e })),
    hand,
    drawPile,
    discardPile,
    cardsPlayed: [],
  };
}

function toSimCard(card: DeckCard): SimCard {
  return {
    id: card.id,
    name: card.name,
    cost: card.cost,
    type: card.type,
    description: card.description,
    upgraded: card.upgraded,
  };
}

/** Deep clone a SimState for branching */
export function cloneSimState(s: SimState): SimState {
  return {
    energy: s.energy,
    player: { ...s.player },
    playerBlock: s.playerBlock,
    enemies: s.enemies.map((e) => ({ ...e })),
    hand: s.hand.map((c) => ({ ...c })),
    drawPile: s.drawPile.map((c) => ({ ...c })),
    discardPile: s.discardPile.map((c) => ({ ...c })),
    cardsPlayed: [...s.cardsPlayed],
  };
}

/** Get playable cards from hand (cost <= energy, X-cost cards need >= 1 energy) */
export function getPlayableCards(state: SimState): SimCard[] {
  return state.hand.filter((c) => {
    if (c.type === "status" || c.type === "curse") return false;
    // X-cost cards (sentinel -1) are playable when energy >= 1
    if (c.cost === -1) return state.energy >= 1;
    return c.cost <= state.energy;
  });
}

/** Calculate damage for a base value given current state */
function calcDamage(base: number, state: SimState, targetEnemy: SimEnemy): number {
  let dmg = base + state.player.strength;
  if (state.player.weak > 0) dmg = Math.floor(dmg * WEAK_MULT);
  if (targetEnemy.vulnerable > 0) dmg = Math.floor(dmg * VULNERABLE_MULT);
  return Math.max(0, dmg);
}

/** Calculate block for a base value given current state */
function calcBlock(base: number, state: SimState): number {
  let block = base + state.player.dexterity;
  if (state.player.frail > 0) block = Math.floor(block * FRAIL_MULT);
  return Math.max(0, block);
}

/** Apply damage to an enemy, accounting for block */
function dealDamageToEnemy(enemy: SimEnemy, damage: number): number {
  let remaining = damage;
  if (enemy.block > 0) {
    const blocked = Math.min(enemy.block, remaining);
    enemy.block -= blocked;
    remaining -= blocked;
  }
  enemy.hp -= remaining;
  return remaining; // actual HP damage dealt
}

/**
 * Smart target selection for single-target cards.
 * - Debuff cards: prefer highest-HP enemy that survives the hit (debuff has lasting value)
 * - Pure damage: prefer weakest enemy (efficient kills, less overkill waste)
 * - If a cheap kill is available, pure damage cards take it
 */
function pickTarget(
  aliveEnemies: SimEnemy[],
  baseDamage: number,
  hits: number,
  state: SimState,
  appliesDebuff: boolean
): SimEnemy {
  if (aliveEnemies.length === 1) return aliveEnemies[0];

  if (appliesDebuff) {
    // Estimate total damage this card deals to each enemy
    // Prefer enemies that will SURVIVE so the debuff persists
    const survivors = aliveEnemies.filter((e) => {
      let totalDmg = 0;
      for (let i = 0; i < hits; i++) {
        totalDmg += calcDamage(baseDamage, state, e);
      }
      const effectiveHp = e.hp + e.block;
      return effectiveHp > totalDmg;
    });

    if (survivors.length > 0) {
      // Among survivors, pick highest HP (debuff scales with remaining fight length)
      return survivors.sort((a, b) => b.hp - a.hp)[0];
    }
    // All enemies would die — just pick highest HP
    return aliveEnemies.sort((a, b) => b.hp - a.hp)[0];
  } else {
    // Pure damage: target weakest to secure kills efficiently
    // Prefer enemies we can actually kill with this card
    const killable = aliveEnemies.filter((e) => {
      let totalDmg = 0;
      for (let i = 0; i < hits; i++) {
        totalDmg += calcDamage(baseDamage, state, e);
      }
      return (e.hp + e.block) <= totalDmg;
    });

    if (killable.length > 0) {
      // Among killable, pick the one with least overkill (most efficient kill)
      return killable.sort((a, b) => {
        const overkillA = calcDamage(baseDamage, state, a) * hits - (a.hp + a.block);
        const overkillB = calcDamage(baseDamage, state, b) * hits - (b.hp + b.block);
        return overkillA - overkillB;
      })[0];
    }

    // Can't kill anyone — target weakest to make progress toward a kill
    return aliveEnemies.sort((a, b) => a.hp - b.hp)[0];
  }
}

/** Simulate playing a single card. Mutates state in place. Returns target info or null if unplayable. */
export function simulateCardPlay(state: SimState, cardId: string): CardPlayTarget | null {
  const cardIndex = state.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) return null;

  const card = state.hand[cardIndex];

  // X-cost cards (sentinel -1) require at least 1 energy and consume all remaining
  if (card.cost === -1) {
    if (state.energy < 1) return null;
    state.energy = 0;
  } else {
    if (card.cost > state.energy) return null;
    state.energy -= card.cost;
  }

  // Remove from hand
  state.hand.splice(cardIndex, 1);
  state.cardsPlayed.push(cardId);

  const desc = card.description.toLowerCase();
  let targetName: string | null = null;

  // Detect if this card applies debuffs (Vulnerable, Weak, etc.)
  const appliesDebuff = /apply \d+ (vulnerable|weak|frail)/i.test(card.description);

  // Parse and apply effects
  // ── Damage ──
  const dmgMatch = card.description.match(/Deal (\d+) damage/i);
  if (dmgMatch) {
    const base = parseInt(dmgMatch[1]);
    const timesMatch = card.description.match(/(\d+) times|twice/i);
    const hits = timesMatch
      ? timesMatch[0].toLowerCase() === "twice" ? 2 : parseInt(timesMatch[1])
      : 1;

    const aliveEnemies = state.enemies.filter((e) => e.hp > 0);
    if (aliveEnemies.length > 0) {
      // Check if it hits ALL enemies
      if (desc.includes("all enemies") || desc.includes("all enemy")) {
        targetName = "All Enemies";
        for (const enemy of aliveEnemies) {
          for (let i = 0; i < hits; i++) {
            const dmg = calcDamage(base, state, enemy);
            dealDamageToEnemy(enemy, dmg);
          }
        }
      } else {
        // Smart targeting:
        // - Cards with debuffs → target highest-HP enemy that will survive (debuff has lasting value)
        // - Pure damage cards → target weakest enemy (efficient kills)
        const target = pickTarget(aliveEnemies, base, hits, state, appliesDebuff);
        targetName = target.name;
        for (let i = 0; i < hits; i++) {
          const dmg = calcDamage(base, state, target);
          dealDamageToEnemy(target, dmg);
        }
      }
    }
  }

  // ── Block ──
  const blockMatch = card.description.match(/Gain (\d+) Block/i);
  if (blockMatch) {
    const base = parseInt(blockMatch[1]);
    state.playerBlock += calcBlock(base, state);
  }

  // ── Apply debuffs (to same target as damage, or highest-HP enemy if no damage) ──
  const vulnMatch = card.description.match(/Apply (\d+) Vulnerable/i);
  if (vulnMatch) {
    const amount = parseInt(vulnMatch[1]);
    const aliveEnemies = state.enemies.filter((e) => e.hp > 0);
    if (aliveEnemies.length > 0) {
      if (desc.includes("all enemies") || desc.includes("all enemy")) {
        for (const e of aliveEnemies) e.vulnerable += amount;
        if (!targetName) targetName = "All Enemies";
      } else {
        // Apply to the same target the damage went to, or highest-HP if no damage
        const debuffTarget = targetName
          ? aliveEnemies.find((e) => e.name === targetName) || aliveEnemies.sort((a, b) => b.hp - a.hp)[0]
          : aliveEnemies.sort((a, b) => b.hp - a.hp)[0];
        debuffTarget.vulnerable += amount;
        if (!targetName) targetName = debuffTarget.name;
      }
    }
  }

  const weakMatch = card.description.match(/Apply (\d+) Weak/i);
  if (weakMatch) {
    const amount = parseInt(weakMatch[1]);
    const aliveEnemies = state.enemies.filter((e) => e.hp > 0);
    if (aliveEnemies.length > 0) {
      if (desc.includes("all enemies") || desc.includes("all enemy")) {
        for (const e of aliveEnemies) e.weak += amount;
        if (!targetName) targetName = "All Enemies";
      } else {
        const debuffTarget = targetName
          ? aliveEnemies.find((e) => e.name === targetName) || aliveEnemies.sort((a, b) => b.hp - a.hp)[0]
          : aliveEnemies.sort((a, b) => b.hp - a.hp)[0];
        debuffTarget.weak += amount;
        if (!targetName) targetName = debuffTarget.name;
      }
    }
  }

  // ── Strength gain ──
  const strMatch = card.description.match(/Gain (\d+) Strength/i);
  if (strMatch) {
    state.player.strength += parseInt(strMatch[1]);
  }

  // ── Dexterity gain ──
  const dexMatch = card.description.match(/Gain (\d+) Dexterity/i);
  if (dexMatch) {
    state.player.dexterity += parseInt(dexMatch[1]);
  }

  // ── Draw cards ──
  const drawMatch = card.description.match(/Draw (\d+) card/i);
  if (drawMatch) {
    const count = parseInt(drawMatch[1]);
    for (let i = 0; i < count && state.drawPile.length > 0; i++) {
      const drawn = state.drawPile.splice(0, 1)[0];
      state.hand.push(drawn);
    }
  }

  // ── Energy gain ──
  const energyMatch = card.description.match(/Gain (\d+) Energy/i);
  if (energyMatch) {
    state.energy += parseInt(energyMatch[1]);
  }

  // Move to discard (unless exhausted)
  if (desc.includes("exhaust")) {
    // Don't add to discard — card is exhausted
  } else {
    state.discardPile.push(card);
  }

  return { cardName: card.name, target: targetName };
}

/** Simulate a full sequence of card plays. Returns the final state and targets. */
export function simulateSequence(state: SimState, cardIds: string[]): { state: SimState; targets: CardPlayTarget[] } {
  const sim = cloneSimState(state);
  const targets: CardPlayTarget[] = [];
  for (const id of cardIds) {
    const result = simulateCardPlay(sim, id);
    if (!result) break;
    targets.push(result);
  }
  return { state: sim, targets };
}

/**
 * Generate all valid play sequences within energy constraints.
 * Uses backtracking. Caps at maxSequences to avoid blowup.
 */
export function generateSequences(
  state: SimState,
  maxSequences: number = 500
): PlaySequence[] {
  const results: PlaySequence[] = [];

  function backtrack(current: SimState, played: { id: string; name: string; target: string | null }[]) {
    if (results.length >= maxSequences) return;

    // Record current sequence if non-empty
    if (played.length > 0) {
      results.push({
        cardIds: played.map((p) => p.id),
        cardNames: played.map((p) => p.name),
        targets: played.map((p) => ({ cardName: p.name, target: p.target })),
      });
    }

    // Try playing each remaining playable card
    const playable = getPlayableCards(current);
    const seen = new Set<string>(); // Dedupe same-name cards

    for (const card of playable) {
      // Skip duplicate card names in same position (e.g., two Strikes)
      if (seen.has(card.name)) continue;
      seen.add(card.name);

      const next = cloneSimState(current);
      const result = simulateCardPlay(next, card.id);
      if (result) {
        played.push({ id: card.id, name: card.name, target: result.target });
        backtrack(next, played);
        played.pop();
      }
    }
  }

  backtrack(state, []);

  // Also add empty sequence (play nothing)
  results.push({ cardIds: [], cardNames: [], targets: [] });

  return results;
}
