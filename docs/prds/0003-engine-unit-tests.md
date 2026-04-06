# 0003 — Recommendation Engine Unit Tests

**Status:** Draft
**Effort:** M
**Confidence:** High

## Problem

The recommendation engine — the entire value driver of Spire Slayer — has zero test coverage. The only test in the project is `expect(true).toBe(true)`. The simulator, scorer, targeting logic, and sequence generator are all untested. Every change to the engine is a regression risk: off-by-one damage calculations, wrong targeting preferences, mis-ordered score priorities, and subtle modifier interactions can all break silently.

## User Stories

- As a developer fixing a card effect bug, I want a test suite I can run to confirm I haven't broken anything else, so I can ship with confidence.
- As a developer adding new card patterns, I want existing behavior locked in by tests so regressions are caught immediately.

## Solution

Add unit tests covering the core engine modules: damage/block calculation, targeting logic, scoring priority ordering, and the sequence generator. Use the existing Vitest setup (already installed and configured via `vitest.config.ts` with jsdom environment and `@` path aliases).

The engine functions are pure with no DOM dependencies — they need no mocking and are trivially testable.

## Acceptance Criteria

- [ ] `calcDamage` is tested with: base damage, strength modifier, weak multiplier, vulnerable multiplier, weak+vulnerable combined, and negative strength clamping.
- [ ] `calcBlock` is tested with: base block, dexterity modifier, frail multiplier, negative dexterity clamping.
- [ ] Damage-to-enemy is tested with: full block absorption, partial block (block breaks), zero block.
- [ ] Smart targeting is tested: debuff cards prefer highest-HP enemy (survives the hit), damage cards prefer the killable enemy with least overkill.
- [ ] Scoring priority order is verified: lethal > kill > damage+block > damage only.
- [ ] `generateSequences` is tested: correct permutations, deduplication of same-name cards, energy constraint enforcement, empty sequence included, maxSequences cap respected.
- [ ] All tests run via `npm test` without modification to production code.

## Technical Approach

### Test Infrastructure

Vitest v3.2.4 is already installed. Config: `vitest.config.ts` uses jsdom, `globals: true`, `@` alias to `./src`, pattern `src/**/*.{test,spec}.{ts,tsx}`. No additional tooling needed.

### New Files

**`src/engine/__tests__/fixtures.ts`** — shared test helpers:
- `makeSimState(overrides?)` — minimal valid `SimState` (3 energy, 1 enemy at 20 HP, basic hand)
- `makeSimEnemy(overrides?)` — `SimEnemy` with sensible defaults
- `makeSimCard(overrides?)` — `SimCard` with defaults
- `makePlayer(overrides?)` — `BuffState` with all zeros

**`src/engine/__tests__/simulator.test.ts`** — largest file, covers:
- `simulateCardPlay`: damage, multi-hit, AoE, block, debuff application, stat gains, draw, exhaust, energy cost enforcement
- `generateSequences`: permutations, deduplication, energy constraints, maxSequences cap
- `createSimState` / `cloneSimState`: correct partition and deep copy

**`src/engine/__tests__/scorer.test.ts`** — covers:
- `scoreState` priority ordering (lethal > kill > block > damage)
- Survival scoring (full block, partial block, kill prevents damage)
- Setup scoring (vulnerability, weakness, strength, dexterity gained)
- Result tags (LETHAL, Aggressive, Defensive, Balanced)
- Edge cases (empty play penalized, dead enemy skipped, non-attacking enemy)

**`src/engine/__tests__/targeting.test.ts`** — via `simulateCardPlay`:
- Debuff card with 2 enemies: targets highest HP (survivor)
- Damage card with 2 enemies: targets killable enemy (least overkill)
- Damage card with no killable enemy: targets weakest (progress toward kill)
- Single enemy: always targeted

**`src/engine/__tests__/enemyIntents.test.ts`** — covers `estimateEnemyDamage`:
- Known enemies return correct values (Jaw Worm → 11, Nob → 16, Cultist → 6)
- Unknown enemy falls back to 7 + strength
- Dead enemies are skipped

### Key Testability Notes

- `calcDamage`, `calcBlock`, `pickTarget` are private — test via `simulateCardPlay`. No production code changes needed.
- Tests must use description strings that match existing regex patterns (e.g., `"Deal 6 damage"`, `"Gain 5 Block"`).
- Critical test case to include: base 5 damage, both Weak and Vulnerable active — weak-first gives 4, vulnerable-first gives 5. This distinguishes ordering and locks in current behavior.
- Keep hands small (2-3 cards) in sequence generator tests to avoid combinatorial slowness.

## Scope

**In:**
- Unit tests for `simulator.ts`, `scorer.ts`, `enemyIntents.ts`
- Shared fixture helpers
- Targeting behavior via simulator integration tests

**Out:**
- `recommend.ts` integration tests (requires full `ExtendedGameInfo` fixture — add as a follow-up once unit tests are in place)
- Tests for the now-deleted `TurnSimulator` files (covered by PRD 0002)
- E2E tests against a live game connection

## Open Questions

- `ExtendedGameInfo` shape: needed for `recommend.ts` tests. Defer until unit tests are merged to keep scope focused.
- Should `calcDamage`/`calcBlock` be exported for more precise isolated tests (Option B) rather than tested through `simulateCardPlay` (Option A)? Recommend Option A to avoid production code changes; revisit if Option A proves too indirect.
