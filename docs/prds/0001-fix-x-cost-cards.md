# 0001 — Fix X-cost Card Energy Calculation

**Status:** Implemented
**Effort:** S
**Confidence:** High

## Problem

Cards with a cost of "X" in Slay the Spire spend all of the player's remaining energy, with their effect scaling based on how much energy was spent. Today, the game state parser converts card costs via `parseInt(card.cost) || 0`, which silently converts the string "X" to 0. Every X-cost card (Whirlwind, Malaise, Skewer, Transmutation, etc.) is treated as free.

The result: the recommendation engine treats X-cost cards as costless additions to any turn plan. A hand containing Whirlwind + Strike + Defend shows plans where all three are played at full energy as if Whirlwind costs nothing. Players following these recommendations are misled about which sequences are actually achievable.

## User Stories

- As a player with an X-cost card in hand, I want the recommendation engine to reflect that playing it spends all my remaining energy, so that suggested sequences are achievable.
- As a player viewing the deck tracker, I want X-cost cards to display "X" as their cost rather than "0", so I can distinguish them from truly free cards.

## Solution

Recognize "X" as a special cost type rather than coercing it to 0. X-cost cards behave as follows:

1. Deck tracker displays "X" as the cost, not "0".
2. An X-cost card is playable as long as the player has at least 1 energy.
3. When simulated, an X-cost card's effective cost equals all remaining energy — remaining energy drops to 0.
4. In the combination generator, an X-cost card terminates the sequence (no further energy-costing cards can follow it).

## Acceptance Criteria

- [ ] An X-cost card in the player's hand displays "X" as its cost in the deck tracker.
- [ ] An X-cost card is considered playable when the player has ≥ 1 energy remaining.
- [ ] An X-cost card is not playable when the player has 0 energy.
- [ ] Simulating an X-cost card play sets remaining energy to 0, regardless of how much was available.
- [ ] Turn plan combinations that include an X-cost card do not include additional energy-costing cards after it.
- [ ] Cards with normal numeric costs (0, 1, 2, 3) continue to behave exactly as before.

## Technical Approach

**Root cause:** `src/hooks/useGameState.ts` line 122 — `parseInt(card.cost) || 0` discards "X".

**Fix propagates to three areas:**

1. **Parsing** (`src/hooks/useGameState.ts`): Detect when `card.cost === "X"` and use a sentinel value (e.g., -1 or a `"X"` union type). The `DeckCard` type in `src/data/deckData.ts` currently types `cost` as `number` and may need widening.

2. **Simulation engine** (`src/engine/simulator.ts`):
   - `getPlayableCards` (line 60-62): X-cost cards are playable when `energy >= 1`.
   - `simulateCardPlay` (line 150-163): When playing an X-cost card, effective cost = all remaining energy; set `state.energy = 0`.

3. **Display** (`src/components/DeckTracker.tsx` line 199): Render "X" for X-cost cards instead of the numeric value.

## Scope

**In:**
- Correct energy cost for X-cost cards in parsing, simulation, combination generation, and display.
- X-cost cards consume all remaining energy when played.

**Out:**
- Scaling effects of X-cost cards (e.g., Whirlwind dealing X hits). This PRD only fixes energy accounting — effect scaling is a separate task.
- Dynamic cost modifications from relics or powers.
- Cards with conditionally changing costs (e.g., Eviscerate).

## Open Questions

- What sentinel value should represent X-cost? A special number (e.g., -1) is simpler; a `number | "X"` union is more explicit but requires wider changes.
- Should X-cost cards be playable at 0 energy? In the actual game they can be played for 0 effect. Requiring ≥ 1 energy biases toward useful recommendations but may diverge from the game's actual rules.
