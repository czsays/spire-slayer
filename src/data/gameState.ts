import type { CardType } from "./deckData";

// ── Buffs & Debuffs ──────────────────────────────────────────────
export interface BuffState {
  strength: number;
  dexterity: number;
  focus: number;
  vulnerable: number;   // turns remaining on enemy
  weak: number;         // turns remaining on player
  frail: number;        // turns remaining on player
  ritual: number;
  vigor: number;
  platedArmor: number;
  metallicize: number;
}

export interface EnemyState {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  block: number;
  vulnerable: number;
  weak: number;
  strength: number;
}

// ── Relics ───────────────────────────────────────────────────────
export interface Relic {
  id: string;
  name: string;
  description: string;
  effect: RelicEffect;
}

export type RelicEffect =
  | { type: "flatDamageBonus"; value: number }
  | { type: "flatBlockBonus"; value: number }
  | { type: "vulnerableMultiplier"; value: number }   // overrides default 1.5×
  | { type: "strengthPerTurn"; value: number }
  | { type: "drawPerTurn"; value: number }
  | { type: "energyPerTurn"; value: number }
  | { type: "healOnKill"; value: number }
  | { type: "custom"; description: string };

// ── Full game snapshot ───────────────────────────────────────────
export interface GameState {
  player: BuffState;
  enemies: EnemyState[];
  relics: Relic[];
  energy: number;
  maxEnergy: number;
}

// ── Sample state matching the screenshot ─────────────────────────
export const sampleGameState: GameState = {
  player: {
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
  },
  enemies: [
    {
      id: "enemy-1",
      name: "Acid Slime",
      hp: 10,
      maxHp: 10,
      block: 0,
      vulnerable: 0,
      weak: 0,
      strength: 0,
    },
    {
      id: "enemy-2",
      name: "Spike Slime",
      hp: 35,
      maxHp: 35,
      block: 0,
      vulnerable: 0,
      weak: 0,
      strength: 0,
    },
    {
      id: "enemy-3",
      name: "Acid Slime (S)",
      hp: 15,
      maxHp: 15,
      block: 0,
      vulnerable: 0,
      weak: 0,
      strength: 0,
    },
  ],
  relics: [
    {
      id: "bound-phylactery",
      name: "Bound Phylactery",
      description: "At the start of your turn, Summon 1.",
      effect: { type: "custom", description: "Start-of-turn Summon 1" },
    },
  ],
  energy: 2,
  maxEnergy: 3,
};

// ── Card effect breakdown ────────────────────────────────────────
export interface EffectLine {
  label: string;
  base: number | null;
  modified: number | null;
  suffix: string;
  changed: boolean;         // true when modifier altered the value
  bonusBreakdown?: string;  // e.g. "+3 Strength"
}

export interface CardEffectResult {
  lines: EffectLine[];
  notes: string[];          // extra info like "Vulnerable: 50% more damage"
}

// ── Calculator ───────────────────────────────────────────────────

const VULNERABLE_MULT = 1.5;
const WEAK_MULT = 0.75;
const FRAIL_MULT = 0.75;

function calcDamage(base: number, state: GameState): { value: number; breakdown: string[] } {
  let dmg = base + state.player.strength;
  const breakdown: string[] = [];

  if (state.player.strength !== 0) {
    breakdown.push(`${state.player.strength > 0 ? "+" : ""}${state.player.strength} Strength`);
  }

  if (state.player.weak > 0) {
    dmg = Math.floor(dmg * WEAK_MULT);
    breakdown.push(`×${WEAK_MULT} (Weak)`);
  }

  const anyVulnerable = state.enemies.some((e) => e.vulnerable > 0);
  if (anyVulnerable) {
    dmg = Math.floor(dmg * VULNERABLE_MULT);
    breakdown.push(`×${VULNERABLE_MULT} (Vulnerable)`);
  }

  // Relic flat bonuses
  for (const r of state.relics) {
    if (r.effect.type === "flatDamageBonus") {
      dmg += r.effect.value;
      breakdown.push(`+${r.effect.value} (${r.name})`);
    }
    if (r.effect.type === "vulnerableMultiplier" && anyVulnerable) {
      // Replace default vulnerable calc — already applied above, but note it
      breakdown.push(`Vuln ×${r.effect.value} (${r.name})`);
    }
  }

  return { value: Math.max(0, dmg), breakdown };
}

function calcBlock(base: number, state: GameState): { value: number; breakdown: string[] } {
  let block = base + state.player.dexterity;
  const breakdown: string[] = [];

  if (state.player.dexterity !== 0) {
    breakdown.push(`${state.player.dexterity > 0 ? "+" : ""}${state.player.dexterity} Dexterity`);
  }

  if (state.player.frail > 0) {
    block = Math.floor(block * FRAIL_MULT);
    breakdown.push(`×${FRAIL_MULT} (Frail)`);
  }

  for (const r of state.relics) {
    if (r.effect.type === "flatBlockBonus") {
      block += r.effect.value;
      breakdown.push(`+${r.effect.value} (${r.name})`);
    }
  }

  return { value: Math.max(0, block), breakdown };
}

/**
 * Parse a card's description and compute effective values given game state.
 */
export function computeCardEffects(
  name: string,
  description: string,
  type: CardType,
  state: GameState
): CardEffectResult {
  const lines: EffectLine[] = [];
  const notes: string[] = [];

  // Parse "Deal X damage" patterns (including "twice", "X times")
  const dmgMatch = description.match(/Deal (\d+) damage/i);
  const timesMatch = description.match(/(\d+) times|twice/i);
  const hits = timesMatch
    ? timesMatch[0] === "twice"
      ? 2
      : parseInt(timesMatch[1])
    : 1;

  if (dmgMatch) {
    const base = parseInt(dmgMatch[1]);
    const { value, breakdown } = calcDamage(base, state);
    const totalBase = base * hits;
    const totalMod = value * hits;

    lines.push({
      label: hits > 1 ? `Damage (×${hits} hits)` : "Damage",
      base: totalBase,
      modified: totalMod,
      suffix: hits > 1 ? ` (${value}×${hits})` : "",
      changed: totalBase !== totalMod,
      bonusBreakdown: breakdown.join(", "),
    });
  }

  // Parse "Gain X Block" patterns
  const blockMatch = description.match(/Gain (\d+) Block/i);
  if (blockMatch) {
    const base = parseInt(blockMatch[1]);
    const { value, breakdown } = calcBlock(base, state);

    lines.push({
      label: "Block",
      base,
      modified: value,
      suffix: "",
      changed: base !== value,
      bonusBreakdown: breakdown.join(", "),
    });
  }

  // Parse "Apply X Vulnerable/Weak"
  const applyMatch = description.match(/Apply (\d+) (Vulnerable|Weak|Frail)/i);
  if (applyMatch) {
    lines.push({
      label: `Apply ${applyMatch[2]}`,
      base: parseInt(applyMatch[1]),
      modified: parseInt(applyMatch[1]),
      suffix: ` turn${parseInt(applyMatch[1]) > 1 ? "s" : ""}`,
      changed: false,
    });
  }

  // Parse "Draw X card(s)"
  const drawMatch = description.match(/Draw (\d+) card/i);
  if (drawMatch) {
    lines.push({
      label: "Draw",
      base: parseInt(drawMatch[1]),
      modified: parseInt(drawMatch[1]),
      suffix: ` card${parseInt(drawMatch[1]) > 1 ? "s" : ""}`,
      changed: false,
    });
  }

  // Parse "Gain X Strength"
  const strMatch = description.match(/Gain (\d+) Strength/i);
  if (strMatch) {
    lines.push({
      label: "Gain Strength",
      base: parseInt(strMatch[1]),
      modified: parseInt(strMatch[1]),
      suffix: "",
      changed: false,
    });
  }

  // Parse "Gain X Energy"
  const energyMatch = description.match(/Gain (\d+) Energy/i);
  if (energyMatch) {
    lines.push({
      label: "Gain Energy",
      base: parseInt(energyMatch[1]),
      modified: parseInt(energyMatch[1]),
      suffix: "",
      changed: false,
    });
  }

  // Parse "Lose X HP"
  const hpLossMatch = description.match(/Lose (\d+) HP/i);
  if (hpLossMatch) {
    lines.push({
      label: "HP Cost",
      base: parseInt(hpLossMatch[1]),
      modified: parseInt(hpLossMatch[1]),
      suffix: "",
      changed: false,
    });
  }

  // Contextual notes
  if (state.player.strength !== 0 && type === "attack") {
    notes.push(`Strength ${state.player.strength > 0 ? "+" : ""}${state.player.strength} applied to damage`);
  }
  if (state.player.dexterity !== 0 && blockMatch) {
    notes.push(`Dexterity ${state.player.dexterity > 0 ? "+" : ""}${state.player.dexterity} applied to block`);
  }
  const vulnEnemies = state.enemies.filter((e) => e.vulnerable > 0);
  if (vulnEnemies.length > 0 && dmgMatch) {
    vulnEnemies.forEach((e) => {
      notes.push(`${e.name} Vulnerable (${e.vulnerable} turns) → +50% damage`);
    });
  }
  if (state.player.weak > 0 && dmgMatch) {
    notes.push(`Player Weak (${state.player.weak} turns) → −25% damage`);
  }
  if (state.player.frail > 0 && blockMatch) {
    notes.push(`Player Frail (${state.player.frail} turns) → −25% block`);
  }

  // Relic notes
  for (const r of state.relics) {
    if (r.effect.type === "custom") {
      notes.push(`${r.name}: ${r.effect.description}`);
    }
  }

  // If nothing was parsed, add a generic line
  if (lines.length === 0) {
    lines.push({
      label: "Effect",
      base: null,
      modified: null,
      suffix: description,
      changed: false,
    });
  }

  return { lines, notes };
}
