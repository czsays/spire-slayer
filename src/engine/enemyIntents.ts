import type { ExtendedGameInfo } from "@/hooks/useGameState";
import type { EnemyState } from "@/data/gameState";

/**
 * Estimate total incoming damage from all enemies this turn.
 * Uses MCP intent data when available, falls back to heuristic estimates.
 */
export function estimateIncomingDamage(
  enemies: EnemyState[],
  extended: ExtendedGameInfo
): number {
  let total = 0;

  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;

    const intents = extended.enemyIntents.get(enemy.id);

    if (intents && intents.length > 0) {
      // Use actual intent data from MCP
      for (const intent of intents) {
        // Handle both camelCase and snake_case property names
        const intentType = (intent.intentType || (intent as any).intent_type || "").toLowerCase();
        const label = intent.label || "";
        if (intentType.includes("attack")) {
          // Intent label usually contains the damage number
          const dmgMatch = label.match(/\d+/);
          if (dmgMatch) {
            total += parseInt(dmgMatch[0]);
          }
        }
      }
    } else {
      // Fallback: estimate based on enemy strength
      total += estimateEnemyDamage(enemy);
    }
  }

  return total;
}

/** Heuristic damage estimate when no intent data is available */
export function estimateEnemyDamage(enemy: EnemyState): number {
  // Base damage estimate: 6-8 for most Act 1 enemies, plus strength
  const baseDamage = 7 + enemy.strength;

  // Known enemy patterns (Act 1)
  const lower = enemy.name.toLowerCase();

  if (lower.includes("jaw worm")) return 11 + enemy.strength;
  if (lower.includes("louse")) return 6 + enemy.strength;
  if (lower.includes("cultist")) return 6 + enemy.strength;
  if (lower.includes("acid slime")) return 8 + enemy.strength;
  if (lower.includes("spike slime")) return 8 + enemy.strength;
  if (lower.includes("fungi beast")) return 6 + enemy.strength;
  if (lower.includes("looter")) return 10 + enemy.strength;
  if (lower.includes("gremlin")) return 5 + enemy.strength;
  if (lower.includes("sentry")) return 9 + enemy.strength;
  if (lower.includes("slaver")) return 12 + enemy.strength;
  if (lower.includes("nob")) return 16 + enemy.strength;
  if (lower.includes("lagavulin")) return 18 + enemy.strength;
  if (lower.includes("hexaghost")) return 6 + enemy.strength; // per hit
  if (lower.includes("slime boss")) return 35 + enemy.strength;
  if (lower.includes("guardian")) return 32 + enemy.strength;

  return baseDamage;
}
