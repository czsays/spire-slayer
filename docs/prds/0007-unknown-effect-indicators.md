# 0007 — Unknown Card Effect Indicators in Recommendations

**Status:** Draft
**Effort:** S
**Confidence:** High

## Problem

The recommendation engine parses card effects by regex matching against English description strings. Cards whose descriptions don't match any known pattern are silently treated as no-ops: zero damage, zero block, no effect. The card still costs energy in the simulation, so the engine actively penalizes playing it while giving the user zero indication the recommendation is based on incomplete information.

Silent wrong answers erode trust faster than visible uncertainty. As players encounter cards from later acts or new STS2 content, the proportion of unrecognized descriptions grows — making this a compounding problem.

## User Stories

- As a player reviewing a recommendation, I want to know when a suggested sequence includes cards the engine couldn't simulate, so I can apply my own judgment instead of blindly following a flawed recommendation.
- As a player debugging unexpected recommendations, I want the debug panel to list which cards failed to parse, so I can identify patterns and mentally compensate.

## Solution

Two lightweight additions:

1. **Per-card confidence indicator in the recommendation panel.** When a card in a recommended sequence had no recognized effects during simulation, it gets a "?" marker next to its name. Hovering shows: "Effect not fully simulated — treat this recommendation as an estimate."

2. **Unparsed cards section in the debug panel.** The existing debug panel (toggled via the bug icon) gains a section listing every hand card whose description matched zero known patterns, along with the raw description text.

## Acceptance Criteria

- [ ] When a card in a recommended sequence had zero recognized effects parsed (no damage, block, debuff, stat buff, draw, or energy gain matched), its name shows a "?" or "estimated" indicator.
- [ ] The indicator does not appear on cards that matched at least one known effect pattern.
- [ ] Hovering or focusing the indicator shows a short tooltip: "Effect not fully simulated — treat this recommendation as an estimate."
- [ ] The debug panel includes a section listing hand cards with unrecognized descriptions (card name + raw description text).
- [ ] When all cards are fully parsed, no indicator appears and the debug section shows "All cards recognized" or is hidden.
- [ ] Unparsed cards do not prevent recommendations from being generated or displayed.

## Technical Approach

**Where parsing fails silently:** `src/engine/simulator.ts` — `simulateCardPlay` runs through regex matches (damage, block, vulnerable, weak, strength, dexterity, draw, energy) without recording whether any matched.

**Minimal change to thread confidence through:**

1. In `simulateCardPlay`, track whether at least one effect regex matched. Add `parsed: boolean` to the `CardPlayTarget` type in `src/engine/types.ts`.

2. `CardPlayTarget` already flows into `PlaySequence.targets` → `Recommendation.sequence.targets`, reaching the UI without extra plumbing.

3. In `RecommendationPanel.tsx` (the sequence rendering loop ~line 80-90), check the `parsed` flag and conditionally render the "?" indicator.

4. For the debug panel: derive the unparsed list from the hand cards via the same regex checks, run against each card's description. This keeps the component self-contained.

**Files to change:**
- `src/engine/types.ts` — add `parsed: boolean` to `CardPlayTarget`
- `src/engine/simulator.ts` — set `parsed` based on whether any regex matched
- `src/components/RecommendationPanel.tsx` — render indicator and debug section

## Scope

**In:**
- `parsed` flag on `CardPlayTarget`.
- Visual "?" indicator on unparsed cards in recommendation sequences.
- Hover tooltip explaining the indicator.
- Debug panel section listing unparsed hand cards with raw descriptions.

**Out:**
- Actually expanding the regex patterns to handle more card descriptions — that's a separate ongoing effort. This PRD is about visibility, not coverage.
- Aggregate "confidence score" on the overall recommendation — adds design complexity for marginal v1 value.
- Blocking or demoting recommendations that include unparsed cards — may still be directionally correct.
- Warning banners or toasts — keep it inline and non-interruptive.

## Open Questions

- Cards that partially parse (some effects recognized, some not — e.g., "Deal 6 damage. Shuffle your discard into your draw.") are currently not flagged because they matched at least one pattern. This is a known gap. Should partial parses be flagged differently? Defer to a follow-up.
- What is the right visual treatment for the "?" indicator in the recommendation row? The row is space-constrained. A small superscript "?" icon may be sufficient; a full "estimated" text label is more explicit. Flag for UX review if this implementation feels too noisy.
