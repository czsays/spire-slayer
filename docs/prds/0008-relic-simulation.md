# 0008 — Relic Effect Simulation in the Recommendation Engine

**Status:** Draft
**Effort:** M
**Confidence:** Medium

## Problem

Relics are displayed as hoverable pills in the sidebar. The type system (`src/data/gameState.ts`) defines a clean discriminated union for relic effects (`flatDamageBonus`, `flatBlockBonus`, `vulnerableMultiplier`, `strengthPerTurn`, `drawPerTurn`, `energyPerTurn`, etc.), and `calcDamage`/`calcBlock` in `gameState.ts` already have working code to apply these effects — but it never runs. A single line in `src/hooks/useGameState.ts` (line 159) converts every relic from the MCP API to `{ type: "custom" }`, discarding the effect type.

Additionally, the engine simulator (`src/engine/simulator.ts`) has its own `calcDamage`/`calcBlock` that read `SimState` only — and `SimState` has no relic data at all. Relics like flat damage/block bonuses and stat-granting effects are systematically ignored, producing recommendations that underestimate or overestimate optimal plays.

## User Stories

- As a player with Vajra (+1 Strength), I want the engine to account for my extra damage, so recommendations reflect what my cards actually deal.
- As a player with a block-bonus relic, I want block recommendations to factor in the relic's contribution, so the engine correctly identifies when I can survive an attack.
- As a developer, I want a relic mapping infrastructure in place so new relics can be added to the simulation incrementally as the game updates.

## Solution

Build a thin mapping layer (`relicEffects.ts`) that translates relic IDs from the MCP API to structured `RelicEffect` types, then thread relics through `SimState` so the simulator's `calcDamage`/`calcBlock` can apply them.

### MVP Effect Categories

| Priority | Effect Type | Rationale |
|----------|-------------|-----------|
| 1 | `flatDamageBonus` | Directly changes per-hit damage math |
| 2 | `flatBlockBonus` | Directly changes per-block math |
| 3 | `energyPerTurn` | Changes which sequences are reachable |
| 4 | `strengthPerTurn` | Affects player strength at turn start |
| 5 | `vulnerableMultiplier` | Override for Paper Krane-style relics |

**Key caveat:** Many stat-granting relics (Vajra, Oddly Smooth Stone) are likely already reflected in the MCP's `player_strength`/`player_dexterity`/`max_energy` fields. The highest-value MVP targets are relics whose effects are NOT captured by those fields: per-hit flat bonuses, block multipliers, and vulnerable multiplier overrides.

**Deferred:** Conditional relics (Pen Nib: every 10th attack; Orichalcum: if 0 block at turn end; Kunai: every 3 attacks played). These cannot be expressed in the current `RelicEffect` union.

## Acceptance Criteria

- [ ] `src/engine/relicEffects.ts` exists with a `resolveRelicEffect(id, name, description)` function returning a structured `RelicEffect`.
- [ ] `useGameState.ts` calls `resolveRelicEffect` instead of hardcoding `{ type: "custom" }`.
- [ ] `SimState` has a `relics` field populated by `createSimState`.
- [ ] The simulator's `calcDamage` applies `flatDamageBonus` and `vulnerableMultiplier` relics.
- [ ] The simulator's `calcBlock` applies `flatBlockBonus` relics.
- [ ] With a flat +1 damage bonus relic equipped, the engine's per-hit damage calculations are 1 higher than without it.
- [ ] Unrecognized relic IDs fall back to `{ type: "custom" }` — no regression from current behavior.
- [ ] Dev-mode logging emits unrecognized relic IDs to make gaps visible.

## Technical Approach

### New File: `src/engine/relicEffects.ts`

Static lookup table: `Map<string, RelicEffect>` keyed by STS2 relic ID string (e.g., `"Vajra"`, `"PaperKrane"`). Function:

```typescript
export function resolveRelicEffect(id: string, name: string, description: string): RelicEffect
```

1. Check static map by `id` (exact match).
2. Fallback: check by normalized `name`.
3. Final fallback: `{ type: "custom", description }`.

Modeled on the static-lookup pattern in `src/engine/enemyIntents.ts` (lines 48-64).

### Single Line Change: `src/hooks/useGameState.ts` line 159

Replace:
```typescript
effect: { type: "custom", description: r.description } as RelicEffect,
```
with:
```typescript
effect: resolveRelicEffect(r.id, r.name, r.description),
```

### `src/engine/types.ts`

Add `relics: Relic[]` to `SimState`.

### `src/engine/simulator.ts`

- **`createSimState`**: Copy `gameState.relics` into `SimState.relics`. Signature gains optional `relics?: Relic[]` or sources from `GameState.relics`.
- **`cloneSimState`**: Shallow-copy the relics array (relics are immutable during a turn).
- **`calcDamage`** (line 66): After existing strength/weak/vulnerable math, iterate `state.relics` for `flatDamageBonus` and `vulnerableMultiplier`.
- **`calcBlock`** (line 74): Same pattern for `flatBlockBonus`.

### `src/engine/recommend.ts`

Pass relics through to `createSimState` from `extended`. The call site at line 83 has access to `extended` which includes the full relic list.

## Scope

**In:**
- `relicEffects.ts` with static ID-to-effect mapping and lookup function.
- Single-line fix in `useGameState.ts` to call `resolveRelicEffect`.
- `SimState.relics` field and propagation through `createSimState`/`cloneSimState`.
- `calcDamage`/`calcBlock` relic application for MVP effect types.
- Dev-mode logging for unrecognized relic IDs.

**Out:**
- Conditional relics (Pen Nib, Orichalcum, Kunai) — require a `conditional` variant in `RelicEffect` and event-based triggering.
- Relic effects that are already pre-applied in the MCP's player stat fields (verify before implementing to avoid double-counting).
- Scorer-level relic effects (healOnKill, etc.) — affects long-term HP, not immediate turn scoring.

## Open Questions

- **Double-counting risk:** Relics like Vajra (+1 Strength) are likely already folded into `player_strength` by the MCP mod. If we also apply `strengthPerTurn` from the relic map, we double-count. **Verify with live data before implementing stat-buff relics.** Start with per-hit flat bonuses that are clearly NOT pre-applied.
- **Relic IDs from the API:** Need a sample of real `AppRelic.id` values from a live run to populate the mapping table accurately. Add a debug log or panel entry that dumps raw relic IDs during development.
- **Relic ID stability:** STS2 is early access; relic IDs could change between patches. The `{ type: "custom" }` fallback ensures no regression when IDs change.
