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

/**
 * Known enemy base damage values. Ordered longest-pattern-first so that
 * specific names (e.g. "gremlin nob") match before generic ones ("gremlin").
 */
const ENEMY_DAMAGE: [string, number][] = [
  ["gremlin nob", 16],
  ["fungi beast", 6],
  ["spike slime", 8],
  ["acid slime", 8],
  ["slime boss", 35],
  ["jaw worm", 11],
  ["lagavulin", 18],
  ["hexaghost", 6], // per hit
  ["guardian", 32],
  ["cultist", 6],
  ["gremlin", 5],
  ["looter", 10],
  ["sentry", 9],
  ["slaver", 12],
  ["louse", 6],
  ["nob", 16],
];

/** Heuristic damage estimate when no intent data is available */
export function estimateEnemyDamage(enemy: EnemyState): number {
  const lower = enemy.name.toLowerCase();
  for (const [pattern, base] of ENEMY_DAMAGE) {
    if (lower.includes(pattern)) return base + enemy.strength;
  }
  return 7 + enemy.strength;
}
