# 0006 — Potion Simulation in the Recommendation Engine

**Status:** Draft
**Effort:** L
**Confidence:** Medium

## Problem

Potions are shown in the UI but completely ignored by the recommendation engine. When the player holds a Block Potion and is about to take lethal damage, the engine recommends a suboptimal card sequence and never suggests drinking the potion. Potions are often the difference between a won and lost run — omitting them from recommendations directly undermines the tool's core value proposition.

## User Stories

- As a player with a Block Potion about to take lethal damage, I want the engine to consider drinking it as part of the recommended sequence, so I don't miss an obvious survival play.
- As a player with a damage potion and a tough enemy, I want the engine to factor potion use into its attack recommendations, so the suggested sequence reflects my full action budget.
- As a player, I want recommendations that include potions to clearly label which potion to drink and when in the sequence.

## Solution

Model potions as 0-cost actions in the recommendation engine's backtracking sequence generator. Each usable potion is treated like a free "card" the engine can include at any point in a turn sequence. Potion effects are simulated using the same description-regex approach already used for cards.

Potion-inclusive recommendations label each potion step (e.g., "Drink Block Potion → Strike → Defend") so the player knows exactly what to do.

### MVP Potion Effects (simulatable from description)

| Category | Examples |
|----------|---------|
| Block | Block Potion (Gain 12 Block) |
| Damage (single target) | Fire Potion (Deal 20 damage) |
| Damage (AoE) | Explosive Potion (Deal 10 to ALL enemies) |
| Stat buffs | Strength Potion, Dexterity Potion, Energy Potion |
| Debuffs | Weak Potion (3 Weak), Fear Potion (3 Vulnerable) |
| Draw | Swift Potion (Draw 3 cards) |

### Deferred Potion Types

Fairy in a Bottle (death trigger), Smoke Bomb (flee), Fruit Juice (max HP), Duplication Potion (sequence-dependent card ordering), Distilled Chaos (random draw), Gambler's Brew (hand replacement), Entropic Brew (random potion generation). These require capabilities beyond the current turn-simulation model.

## Acceptance Criteria

- [ ] Usable potions (`can_use: true`) are included as possible actions in the recommendation engine's sequence generator.
- [ ] A recommendation that includes a potion displays which potion to use and at which step in the sequence.
- [ ] Block Potion is correctly simulated as granting block (prevents lethal when block is sufficient).
- [ ] Fire Potion is correctly simulated as dealing single-target damage.
- [ ] Strength/Dexterity Potion is correctly simulated as buffing subsequent card plays in the same sequence.
- [ ] An optimal sequence that requires drinking a potion first (e.g., gain energy or strength before playing a card) is discoverable.
- [ ] Deduplication correctly treats "same cards played, same potion used" as a single recommendation.
- [ ] Potions with unrecognized descriptions are included as actions but flagged (no-op simulation with unknown-effect indicator per PRD 0007).

## Technical Approach

### New Types (`src/engine/types.ts`)

Add `SimPotion` interface: `{ id, name, description, canUse, slot }`.

Add to `SimState`:
- `potions: SimPotion[]`
- `potionsUsed: string[]`

Add to `PlaySequence` / `Recommendation`: `potionsUsed: { name: string; step: number }[]` to communicate which potion at which step.

### Shared Effect Parser Refactor (`src/engine/simulator.ts`)

Extract `applyDescriptionEffects(state, description, source)` from the middle of `simulateCardPlay` (lines 174-278). This shared function contains all existing regex handling (damage, block, debuffs, stat buffs, draw, energy). Both `simulateCardPlay` and the new `simulatePotionUse` call this function. This is the core refactor and the highest-risk change — write tests (PRD 0003) before doing this.

### New Function: `simulatePotionUse` (`src/engine/simulator.ts`)

```
function simulatePotionUse(state: SimState, potionId: string): ActionStep | null
```

Finds the potion by id, removes it from `state.potions`, adds to `state.potionsUsed`, calls `applyDescriptionEffects`, returns an `ActionStep` with `type: "potion"`.

### Modified `generateSequences` (`src/engine/simulator.ts`)

At each backtrack step, the available actions are:
1. `getPlayableCards(current)` — existing
2. `getUsablePotions(current)` — new: potions with `canUse === true` not yet used

Potions are 0-cost; they expand the action space without consuming energy. Try potions early in the backtracking ordering (before cards) to improve quality within the 500-sequence cap, since they are free actions.

### Wiring in `recommend.ts`

`createSimState` gains an optional `potions?: SimPotion[]` parameter. The call site in `recommend.ts` (line 83) passes `extended.potions` mapped to `SimPotion[]`. The conversion respects `can_use` so only currently usable potions are included.

### Deduplication Update (`src/engine/recommend.ts` line 118)

The dedup key must encode potions used (in addition to cards played, damage, block, kills).

## Scope

**In:**
- Potion simulation as 0-cost actions in sequence generation.
- Shared `applyDescriptionEffects` refactor.
- MVP potion categories: block, single/AoE damage, stat buffs, debuffs, draw, energy.
- Potion labeling in recommendation output.
- Deduplication update.

**Out:**
- Potion recommendation UI (rendering the potion step in `RecommendationPanel` — implement as a follow-up once the engine is updated).
- Deferred potion types (Fairy in a Bottle, Smoke Bomb, Duplication, Distilled Chaos, Gambler's Brew).
- Multi-turn potion conservation strategy (the engine is per-turn greedy; saving potions for later is out of scope).

## Open Questions

- Does `can_use` from the STS2MCP API accurately reflect usability during the play phase? Needs live verification.
- Are potion description strings from the API stable and regex-parseable? Sample real potion descriptions before committing to the regex approach — a name-based lookup table may be more reliable.
- Combinatorial concern: with 5 hand cards and 3 potions, worst-case sequences grow from 5! to 8!. The existing 500-sequence cap mitigates this, but may cause the engine to miss the best potion sequence. Monitor in testing. Mitigation: try potions first in backtracking order.
- Should the engine recommend NOT using a potion (saving for later)? The current per-turn greedy model cannot reason about this — known limitation, out of scope.
