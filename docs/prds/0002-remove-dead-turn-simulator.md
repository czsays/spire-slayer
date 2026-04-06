# 0002 — Remove Dead Simulation Code

**Status:** Implemented
**Effort:** XS
**Confidence:** High

## Problem

The codebase contains two files that implement an older turn simulation system:
- `src/data/turnSimulator.ts` (~237 lines)
- `src/components/TurnSimulator.tsx` (~173 lines)

Both were fully replaced by `src/engine/` when the recommendation engine landed in PR #3. Neither file is imported or rendered anywhere in the application. `TurnSimulator.tsx` is the only consumer of `turnSimulator.ts`, and neither is imported by any other file — the dependency is fully self-contained.

Dead code creates ongoing costs: contributors waste time understanding files that do nothing, the presence of `TurnSimulator.tsx` implies a UI feature that doesn't exist, and both files participate in type-checking and IDE indexing.

## User Stories

- As a developer working on the engine, I want the codebase to contain only one simulation system so I don't have to figure out which one is active.
- As a new contributor, I want dead code removed so I can trust that every file in the repository is actually used.

## Solution

Delete the two files. No replacement UI or logic is needed — `src/engine/` already provides the active simulation and recommendation system.

## Acceptance Criteria

- [x] `src/data/turnSimulator.ts` is deleted from the repository.
- [x] `src/components/TurnSimulator.tsx` is deleted from the repository.
- [x] No remaining file imports from either deleted path (verified by a codebase-wide search for "turnSimulator" and "TurnSimulator").
- [x] The project builds successfully with no type errors.
- [x] All existing tests pass without modification.

## Technical Approach

**Files to delete:**
- `src/data/turnSimulator.ts`
- `src/components/TurnSimulator.tsx`

**Imports to clean up:** None. A codebase-wide search confirms `TurnSimulator.tsx` imports from `turnSimulator.ts`, but no other file imports from either. The dependency is fully self-contained.

**Verification:**
1. Delete both files.
2. Run `tsc --noEmit` to confirm no broken imports.
3. Run `npm test` to confirm no regressions.

## Scope

**In:**
- Deleting the two confirmed-dead files.
- Verifying build and tests still pass.

**Out:**
- Refactoring or modifying `src/engine/` — it is the active system and unaffected.
- Removing any other potentially unused files — scope to only these two confirmed files.
- Adding new tests — nothing new to test; this is purely a deletion.

## Open Questions

None. The two files are confirmed unused. This is a straightforward deletion with no ambiguity.
