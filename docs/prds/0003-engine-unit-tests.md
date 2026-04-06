# 0003 — Recommendation Engine Unit Tests

**Status:** Implemented
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

- [x] `calcDamage` is tested with: base damage, strength modifier, weak multiplier, vulnerable multiplier, weak+vulnerable combined, and negative strength clamping.
- [x] `calcBlock` is tested with: base block, dexterity modifier, frail multiplier, negative dexterity clamping.
- [x] Damage-to-enemy is tested with: full block absorption, partial block (block breaks), zero block.
- [x] Smart targeting is tested: debuff cards prefer highest-HP enemy (survives the hit), damage cards prefer the killable enemy with least overkill.
- [x] Scoring priority order is verified: lethal > kill > damage+block > damage only.
- [x] `generateSequences` is tested: correct permutations, deduplication of same-name cards, energy constraint enforcement, empty sequence included, maxSequences cap respected.
- [x] All tests run via `npm test` without modification to production code.

## Technical Approach

### Test Infrastructure

Vitest v3.2.4 is already installed. Config: `vitest.config.ts` uses jsdom, `globals: true`, `@` alias to `./src`, pattern `src/**/*.{test,spec}.{ts,tsx}`. No additional tooling needed.

### New Files

**`src/engine/__tests__/fixtures.ts`** — shared test helpers
**`src/engine/__tests__/simulator.test.ts`** — 35 tests (simulateCardPlay, generateSequences, createSimState, cloneSimState)
**`src/engine/__tests__/scorer.test.ts`** — 15 tests (priority ordering, survival, setup scoring, tags)
**`src/engine/__tests__/targeting.test.ts`** — 5 tests (debuff/damage targeting via simulateCardPlay)
**`src/engine/__tests__/enemyIntents.test.ts`** — 9 tests (known enemies, fallback, dead enemies)

### Key Testability Notes

- `calcDamage`, `calcBlock`, `pickTarget` are private — test via `simulateCardPlay`. No production code changes needed.
- Tests use description strings matching existing regex patterns.
- Critical test: base 5 damage with both Weak AND Vulnerable — weak-first gives 4, locks in current ordering.
- Hands kept small (2-3 cards) in sequence generator tests.

## Scope

**In:**
- Unit tests for `simulator.ts`, `scorer.ts`, `enemyIntents.ts`
- Shared fixture helpers
- Targeting behavior via simulator integration tests

**Out:**
- `recommend.ts` integration tests (requires full `ExtendedGameInfo` fixture)
- Tests for the now-deleted `TurnSimulator` files (covered by PRD 0002)
- E2E tests against a live game connection

## Open Questions

- `ExtendedGameInfo` shape: needed for `recommend.ts` tests. Deferred to follow-up.
- Should `calcDamage`/`calcBlock` be exported for more precise isolated tests? Option A (test via simulateCardPlay) chosen to avoid production code changes.
