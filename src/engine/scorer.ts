import type { SimState } from "./types";
import type { DEFAULT_WEIGHTS, ScoringWeights } from "./types";

export interface EnemyIntentInfo {
  damage: number;
  debuffs: string[];
  isBuff: boolean;      // enemy is buffing itself (no attack)
  isAttacking: boolean;  // enemy intends to deal damage
}

interface ScoreResult {
  score: number;
  reasoning: string[];
  tags: string[];
  totalDamage: number;
  totalBlock: number;
  enemiesKilled: number;
  incomingDamage: number;
  unblockedDamage: number;
  incomingDebuffs: string[];
}

/**
 * Estimate how many turns remain in this fight.
 * Used to value buffs/setup — they compound over remaining turns.
 */
function estimateRemainingTurns(before: SimState): number {
  const totalEnemyHp = before.enemies
    .filter((e) => e.hp > 0)
    .reduce((sum, e) => sum + e.hp + e.block, 0);

  // Rough estimate: how much damage can the player deal per turn?
  // Use hand size * ~5 avg damage as a crude approximation
  const avgDamagePerTurn = Math.max(10, before.hand.length * 5);
  const turns = Math.ceil(totalEnemyHp / avgDamagePerTurn);
  return Math.max(1, Math.min(turns, 8)); // clamp 1-8
}

/**
 * Score a simulation result after playing a sequence of cards.
 * Higher score = better play.
 *
 * Core philosophy: HP is the player's most valuable resource. Blocking
 * incoming damage is prioritized over dealing damage, UNLESS enemies
 * are not attacking — then the value of actions depends on fight context
 * (setup/buffs are better in longer fights, damage is better in short ones).
 */
export function scoreState(
  before: SimState,
  after: SimState,
  expectedDamage: number,
  weights: ScoringWeights,
  enemyIntentMap: Map<string, EnemyIntentInfo> = new Map()
): ScoreResult {
  const reasoning: string[] = [];
  const tags: string[] = [];
  let score = 0;

  // ── Determine enemy intent context ──
  let anyEnemyAttacking = false;
  let anyEnemyBuffing = false;
  for (const enemy of before.enemies) {
    if (enemy.hp <= 0) continue;
    const info = enemyIntentMap.get(enemy.id);
    if (info) {
      if (info.isAttacking) anyEnemyAttacking = true;
      if (info.isBuff) anyEnemyBuffing = true;
    }
  }

  // ── Estimate fight length for scaling setup value ──
  const remainingTurns = estimateRemainingTurns(before);

  // ── Deck composition for contextual buff value ──
  const allCards = [...before.hand, ...before.drawPile, ...before.discardPile];
  const attackCount = allCards.filter((c) => c.type === "attack").length;
  const skillCount = allCards.filter((c) => c.type === "skill").length;
  const totalCards = allCards.length || 1;
  const attackRatio = attackCount / totalCards;
  const skillRatio = skillCount / totalCards;

  // ── Count enemies killed and total damage dealt ──
  let totalDamage = 0;
  let enemiesKilled = 0;
  const allDead = after.enemies.every((e) => e.hp <= 0);

  for (let i = 0; i < before.enemies.length; i++) {
    const enemyBefore = before.enemies[i];
    const enemyAfter = after.enemies[i];
    if (enemyBefore.hp <= 0) continue;

    const hpLost = Math.max(0, enemyBefore.hp - enemyAfter.hp);
    const blockBroken = Math.max(0, enemyBefore.block - enemyAfter.block);
    totalDamage += hpLost + blockBroken;

    if (enemyAfter.hp <= 0 && enemyBefore.hp > 0) {
      enemiesKilled++;
    }
  }

  // ── Total block gained ──
  const totalBlock = after.playerBlock - before.playerBlock;

  // ── Calculate damage avoided/incoming from intents ──
  let damageAvoided = 0;
  let incomingDamage = 0;
  const incomingDebuffs: string[] = [];

  for (let i = 0; i < before.enemies.length; i++) {
    const eb = before.enemies[i];
    const ea = after.enemies[i];
    if (eb.hp <= 0) continue;

    const intentInfo = enemyIntentMap.get(eb.id) || { damage: 0, debuffs: [], isBuff: false, isAttacking: false };

    if (ea.hp <= 0) {
      damageAvoided += intentInfo.damage;
    } else {
      incomingDamage += intentInfo.damage;
      incomingDebuffs.push(...intentInfo.debuffs);
    }
  }

  const unblockedDamage = Math.max(0, incomingDamage - totalBlock);

  // ═══════════════════════════════════════════════════════════════
  // SCORING — HP preservation is king
  // ═══════════════════════════════════════════════════════════════

  // ── Lethal (always top priority) ──
  if (allDead && before.enemies.some((e) => e.hp > 0)) {
    score += weights.lethal;
    tags.push("LETHAL!");
    if (damageAvoided > 0) {
      reasoning.push(`Kills all enemies! Avoids ${damageAvoided} incoming damage`);
    } else {
      reasoning.push(`Kills all enemies!`);
    }
  }

  // ── Per-kill bonus ──
  if (enemiesKilled > 0 && !allDead) {
    score += enemiesKilled * weights.kill;
    score += damageAvoided * weights.survival;
    if (damageAvoided > 0) {
      reasoning.push(`Kills ${enemiesKilled} enem${enemiesKilled > 1 ? "ies" : "y"} — avoids ${damageAvoided} incoming damage`);
    } else {
      reasoning.push(`Kills ${enemiesKilled} enem${enemiesKilled > 1 ? "ies" : "y"}`);
    }
  }

  // ── Survival: blocking and HP preservation ──
  if (incomingDamage > 0) {
    const effectiveBlock = Math.min(totalBlock, incomingDamage);
    score += effectiveBlock * weights.survival;

    if (effectiveBlock >= incomingDamage) {
      reasoning.push(`Blocks all ${incomingDamage} incoming damage`);
    } else if (effectiveBlock > 0) {
      reasoning.push(`Blocks ${effectiveBlock}/${incomingDamage} incoming damage`);
    }

    if (unblockedDamage > 0) {
      score -= unblockedDamage * weights.survival * 2.0;
      reasoning.push(`Takes ${unblockedDamage} unblocked damage`);
    }
  }

  // ── Damage dealing (flat value, no passive multiplier) ──
  if (!allDead) {
    for (let i = 0; i < after.enemies.length; i++) {
      const eb = before.enemies[i];
      const ea = after.enemies[i];
      if (eb.hp <= 0) continue;

      const hpLost = Math.max(0, eb.hp - ea.hp);
      if (hpLost > 0) {
        const hpRatio = ea.hp <= 0 ? 2.0 : 1.0 + (1.0 - ea.hp / eb.maxHp);
        score += hpLost * weights.damage * hpRatio;
      }
    }

    if (totalDamage > 0) {
      reasoning.push(`Deals ${totalDamage} total damage`);
    }
  }

  // ── Setup value (scales with remaining fight length + deck context) ──
  let setupValue = 0;

  // Vulnerability applied — value scales with remaining turns (more future attacks benefit)
  for (let i = 0; i < after.enemies.length; i++) {
    if (after.enemies[i].hp <= 0) continue;
    const vulnGained = after.enemies[i].vulnerable - before.enemies[i].vulnerable;
    if (vulnGained > 0) {
      const turnsActive = Math.min(vulnGained, remainingTurns);
      setupValue += turnsActive * 5 * attackRatio * 3; // more attacks in deck = more value
      reasoning.push(`Applies ${vulnGained} Vulnerable (~${turnsActive} turns)`);
    }
  }

  // Weakness applied — value scales with enemy attack frequency
  for (let i = 0; i < after.enemies.length; i++) {
    if (after.enemies[i].hp <= 0) continue;
    const weakGained = after.enemies[i].weak - before.enemies[i].weak;
    if (weakGained > 0) {
      const turnsActive = Math.min(weakGained, remainingTurns);
      // Weak reduces enemy damage ~25% — very valuable for survival
      setupValue += turnsActive * 6;
      reasoning.push(`Applies ${weakGained} Weak (~${turnsActive} turns)`);
    }
  }

  // Strength gained — value = remaining turns × attack cards ratio
  const strGained = after.player.strength - before.player.strength;
  if (strGained > 0) {
    // Each point of Strength adds ~strGained damage per attack card per remaining turn
    const futureValue = strGained * remainingTurns * attackRatio * 8;
    setupValue += futureValue;
    reasoning.push(`Gains ${strGained} Strength (${remainingTurns} turns left, ${Math.round(attackRatio * 100)}% attacks)`);
  }

  // Dexterity gained — value = remaining turns × skill cards ratio
  const dexGained = after.player.dexterity - before.player.dexterity;
  if (dexGained > 0) {
    const futureValue = dexGained * remainingTurns * skillRatio * 8;
    setupValue += futureValue;
    reasoning.push(`Gains ${dexGained} Dexterity (${remainingTurns} turns left, ${Math.round(skillRatio * 100)}% skills)`);
  }

  if (setupValue > 0) {
    score += setupValue * weights.setup;
    tags.push("Setup");
  }

  // ── Energy efficiency ──
  const energyUsed = before.energy - after.energy;
  if (energyUsed > 0 && (totalDamage > 0 || totalBlock > 0)) {
    const efficiencyPerEnergy = (totalDamage + totalBlock) / energyUsed;
    score += efficiencyPerEnergy * weights.efficiency;
  }

  // ── Penalize playing nothing ──
  if (after.cardsPlayed.length === 0) {
    score -= 50;
  }

  // ── Tags ──
  const hasLethal = tags.includes("LETHAL!");
  if (!hasLethal) {
    if (totalDamage > 0 && totalDamage > totalBlock * 2) tags.unshift("Aggressive");
    else if (totalBlock > 0 && totalBlock > totalDamage * 2) tags.push("Defensive");
    else if (totalDamage > 0 && totalBlock > 0) tags.unshift("Balanced");
    else if (totalDamage > 0) tags.unshift("Aggressive");
    else if (totalBlock > 0) tags.push("Defensive");
  }

  return {
    score,
    reasoning,
    tags,
    totalDamage,
    totalBlock,
    enemiesKilled,
    incomingDamage,
    unblockedDamage,
    incomingDebuffs,
  };
}
