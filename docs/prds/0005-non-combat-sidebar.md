# 0005 — Non-Combat Sidebar Content

**Status:** Draft
**Effort:** M
**Confidence:** Medium

## Problem

When the game is in any non-combat state (map, reward, shop, event — roughly half of a run), the sidebar renders stale combat UI: empty enemy list, zeroed energy, a card list stuck on last combat's pile positions, and a recommendation panel that returns nothing. The app is pinned as an always-on-top sidebar, so it looks broken for long stretches of every play session.

## User Stories

- As a player navigating the map, I want the sidebar to show my run status at a glance (HP, gold, deck composition, relics) so I can plan without opening in-game menus.
- As a player picking a card reward, I want to see my current deck type breakdown (attack/skill/power counts) so I can judge what my deck is missing.
- As a player at the shop, I want gold prominently shown alongside deck stats so I can decide what to buy.
- As a player in any non-combat state, I want the sidebar to look intentionally contextual, not broken.

## Solution

Branch the sidebar layout on `stateType`. Hide all combat-specific sections (enemy list, buff bar, draw odds, recommendation panel) when not in combat, and show a contextual run summary instead.

### Per-state content

**Map / Navigation:**
- State label: "Map — Act N, Floor N"
- Player HP and gold (already shown — keep as-is)
- Deck composition summary: total cards, type counts (attack / skill / power / curse / status), average card cost
- Relic list with hover tooltips (currently only shown inside BuffsBar; extract for reuse)
- Potion inventory (individual names — see PRD 0004)

**Reward (card pick):**
- State label: "Choosing Reward"
- Everything from Map view
- Deck type breakdown **prominently** displayed (larger/highlighted, since this is the decision-relevant info)
- Compact card list: card name and type only — no pile column, no draw odds

**Shop:**
- State label: "Shop"
- Everything from Map view
- Gold visually emphasized (larger or highlighted — it's the key resource here)
- Potion slot capacity shown: "N / 3 potion slots filled"

**Event:**
- State label: "Event"
- Same as Map view (event choices aren't exposed by the API)

**Unknown / Fallback:**
- Show player status, relic list, and deck composition summary
- State label: raw `stateType` string, capitalized (informative rather than blank)
- Never a blank sidebar when connected

### Deck Composition Summary Component

A new `DeckSummary` component derived from the existing deck data (ignoring pile locations, counting all cards):
- Total deck size
- Type breakdown: N attacks, N skills, N powers, N curses
- Average card cost

This data is computable from `extended` without any new API fields.

## Acceptance Criteria

- [ ] When `stateType !== "combat"`, combat-specific sections (enemy list, buff bar, draw odds, recommendation panel) are hidden.
- [ ] In every non-combat state, the sidebar shows at minimum: HP, gold, relics, potions, and deck composition summary.
- [ ] Each non-combat state shows a visible state label so the sidebar feels intentionally state-aware.
- [ ] In reward state, deck type breakdown (attack/skill/power counts) and average cost are prominently displayed.
- [ ] In shop state, gold is visually emphasized and potion slot capacity is shown (e.g., "2 / 3 slots").
- [ ] Unknown/unhandled state types degrade gracefully (run summary + raw state label), never a blank body.
- [ ] State transitions (e.g., combat ending → map) update the sidebar within one polling cycle (~500ms) without user interaction.

## Technical Approach

**Primary file:** `src/components/DeckTracker.tsx` — the main sidebar component where state branching is added.

**Gate already exists:** `src/engine/recommend.ts` line 21 already guards on `stateType !== "combat"`. The same `stateType` from `ExtendedGameInfo` (in `src/hooks/useGameState.ts`) drives the new branching.

**New component:** `src/components/DeckSummary.tsx` — computes type counts and average cost from the deck array (pile locations ignored). Reusable across Map, Reward, and Shop views.

**Relic display extraction:** The relic list (currently inside BuffsBar, which is combat-only) should be extracted into a standalone `RelicList` component so it can be used in the run overview.

**State type strings:** The Rust backend (`src-tauri/src/state.rs` lines 370-374) normalizes "monster", "elite", "boss" → "combat" but passes other states through raw. The actual non-combat state strings from the STS2MCP API need to be verified by observing live game data. The fallback view handles any unrecognized strings gracefully.

**Deck data in non-combat states:** The API sends pile locations even outside combat. All cards should be treated as "in deck" regardless of pile for the deck summary. Pile info and draw odds are never shown outside combat.

## Scope

**In:**
- State-aware sidebar layout (combat vs. non-combat branching)
- Run summary dashboard for map/event/unknown states
- Deck composition summary component
- Enhanced views for reward (deck type breakdown) and shop (gold emphasis, potion slot capacity)
- Extracted relic list component

**Out:**
- Reward card pick rankings (API doesn't expose cards being offered)
- Shop inventory display or buy recommendations (API doesn't expose shop items)
- Event choice guidance (would require an event database — separate feature)
- Map pathing recommendations (requires graph data not in API)
- Deck history / cards added per floor (requires stateful tracking over time)

## Open Questions

- **State type strings:** What are the exact strings the STS2MCP API sends for non-combat states? ("reward" vs. "card_reward"? "shop" vs. "shop_room"?) Answer by logging raw `stateType` during a live run.
- **Potion slot capacity:** The API provides the list of held potions but not the total slot count (varies by relic). Can we reliably determine capacity, or should we show held count only (e.g., "2 potions" rather than "2 / 3")?
- **Relic display during combat:** If relics are extracted into a standalone component, should they also be shown in the combat view? Currently they're in BuffsBar — verify whether this is intentional.
