import type { DeckCard } from "@/data/deckData";
import type { GameState } from "@/data/gameState";
import type { ExtendedGameInfo } from "@/hooks/useGameState";
import type { Recommendation } from "./types";
import { DEFAULT_WEIGHTS } from "./types";
import { createSimState, generateSequences, simulateSequence, cloneSimState } from "./simulator";
import { scoreState, type EnemyIntentInfo } from "./scorer";
import { estimateIncomingDamage } from "./enemyIntents";

/**
 * Get top N card play recommendations for the current game state.
 * Returns ranked suggestions with scores and reasoning.
 */
export function getRecommendations(
  gameState: GameState,
  deck: DeckCard[],
  extended: ExtendedGameInfo,
  topN: number = 3
): Recommendation[] {
  // Only recommend during combat with cards in hand
  if (extended.stateType !== "combat") return [];
  if (!extended.isPlayPhase) return [];

  const handCards = deck.filter((c) => c.pile === "hand");
  if (handCards.length === 0) return [];

  // Estimate incoming damage for survival scoring
  const expectedDamage = estimateIncomingDamage(gameState.enemies, extended);

  // Build per-enemy intent map (damage, debuffs, buff/attack flags)
  const enemyIntentMap = new Map<string, EnemyIntentInfo>();

  // Intent types that are non-attack negative effects on player
  const debuffIntentTypes = new Set([
    "statuscard", "debuff", "defenddebuff", "attackdebuff",
    "strategicdebuff", "curse",
  ]);

  // Intent types where enemy buffs itself
  const buffIntentTypes = new Set([
    "buff", "attackbuff", "defendbuff", "strategicbuff",
  ]);

  for (const enemy of gameState.enemies) {
    if (enemy.hp <= 0) continue;
    const intents = extended.enemyIntents.get(enemy.id);
    let dmg = 0;
    const debuffs: string[] = [];
    let isBuff = false;
    let isAttacking = false;

    if (intents && intents.length > 0) {
      for (const intent of intents) {
        const intentType = ((intent as any).intentType || (intent as any).intent_type || "").toLowerCase();
        const label = intent.label || "";
        const desc = intent.description || "";

        // Parse damage from attack intents
        if (intentType.includes("attack")) {
          isAttacking = true;
          const match = label.match(/\d+/);
          if (match) dmg += parseInt(match[0]);
        }

        // Detect enemy self-buff
        if (buffIntentTypes.has(intentType) || intentType.includes("buff")) {
          isBuff = true;
        }

        // Parse debuffs/status effects on player
        if (debuffIntentTypes.has(intentType) ||
            intentType.includes("debuff") ||
            intentType.includes("status") ||
            /vulnerable|weak|frail|poison|wound|daze|burn|curse/i.test(desc)) {
          debuffs.push(desc || `${intentType}: ${label}`);
        }
      }
    }
    enemyIntentMap.set(enemy.id, { damage: dmg, debuffs, isBuff, isAttacking });
  }

  // Create base simulation state
  const baseState = createSimState(gameState, deck);

  // Generate all valid play sequences
  const sequences = generateSequences(baseState);

  // Score each sequence
  const scored: Recommendation[] = [];

  for (const seq of sequences) {
    if (seq.cardIds.length === 0) continue; // Skip "do nothing"

    const beforeState = cloneSimState(baseState);
    const { state: afterState } = simulateSequence(baseState, seq.cardIds);

    const result = scoreState(beforeState, afterState, expectedDamage, DEFAULT_WEIGHTS, enemyIntentMap);

    scored.push({
      sequence: seq,
      score: result.score,
      reasoning: result.reasoning,
      tags: result.tags,
      totalDamage: result.totalDamage,
      totalBlock: result.totalBlock,
      enemiesKilled: result.enemiesKilled,
      incomingDamage: result.incomingDamage,
      unblockedDamage: result.unblockedDamage,
      incomingDebuffs: result.incomingDebuffs,
    });
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Deduplicate by outcome — sequences with the same cards+targets (in any order)
  // and identical results are considered equivalent; keep the highest-scored one
  const seen = new Set<string>();
  const deduped: Recommendation[] = [];
  for (const rec of scored) {
    // Sort card+target pairs alphabetically so order doesn't matter
    const plays = rec.sequence.targets
      .map((t) => `${t.cardName}→${t.target || "self"}`)
      .sort()
      .join("|");
    const key = `${plays}::${rec.totalDamage}:${rec.totalBlock}:${rec.enemiesKilled}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(rec);
    }
  }

  return deduped.slice(0, topN);
}
