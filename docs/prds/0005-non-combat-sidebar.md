# 0005 — Non-Combat Sidebar Content

**Status:** Ready
**Effort:** M
**Confidence:** High

## Problem

When the game is in any non-combat state (map, reward, shop, event — roughly half of a run), the sidebar renders stale combat UI: empty enemy list, zeroed energy, a card list stuck on last combat's pile positions, and a recommendation panel that returns nothing. The app is pinned as an always-on-top sidebar, so it looks broken for long stretches of every play session.

## User Stories

- As a player navigating the map, I want the sidebar to show my run status at a glance (HP, gold, deck composition, relics) so I can plan without opening in-game menus.
- As a player picking a card reward, I want to see my current deck type breakdown (attack/skill/power counts) so I can judge what my deck is missing.
- As a player at the shop, I want gold prominently shown alongside deck stats so I can decide what to buy.
- As a player in any non-combat state, I want the sidebar to look intentionally contextual, not broken.

## Solution

Branch the sidebar layout on `stateType`. Hide all combat-specific sections (enemy list, buff bar, draw odds, recommendation panel) when not in combat, and show a contextual run summary instead.

### Verified State Types (from STS2MCP `McpMod.StateBuilder.cs`)

The Rust backend normalizes `"monster"`, `"elite"`, `"boss"` → `"combat"`. All other strings pass through raw. The full set of non-combat state types:

| API String | Category | Sidebar Treatment |
|---|---|---|
| `"map"` | Navigation | Run Summary |
| `"shop"` | Decision | Run Summary + gold emphasis |
| `"rest_site"` | Decision | Run Summary (campfire) |
| `"event"` | Decision | Run Summary |
| `"card_reward"` | Reward | Run Summary + deck breakdown emphasis |
| `"rewards"` | Reward | Run Summary (general reward: gold/potions/relics) |
| `"card_select"` | Overlay | Run Summary (transform/upgrade pick) |
| `"relic_select"` | Overlay | Run Summary |
| `"bundle_select"` | Overlay | Run Summary |
| `"hand_select"` | Overlay | Pass-through to combat view (mid-combat) |
| `"treasure"` | Navigation | Run Summary |
| `"menu"` | No run | Minimal — "No active run" message |
| `"unknown"` / other | Fallback | Run Summary + raw label |

### Per-state content

**Run Summary (base view — shared by all non-combat, non-menu states):**
- State label: contextual (see below)
- Player HP and gold (already shown — keep as-is)
- Deck composition summary: total cards, type counts (attack / skill / power / curse / status), average card cost
- Relic list with hover tooltips (currently only shown inside BuffsBar; extract for reuse)
- Potion inventory (individual names — see PRD 0004)

**Map / Navigation (`"map"`, `"treasure"`):**
- State label: "Map — Act N, Floor N"
- Run Summary base view

**Card Reward (`"card_reward"`):**
- State label: "Choosing Card Reward"
- Run Summary base view
- Deck type breakdown **prominently** displayed (larger/highlighted, since this is the decision-relevant info)
- Compact card list: card name and type only — no pile column, no draw odds

**General Rewards (`"rewards"`):**
- State label: "Rewards"
- Run Summary base view

**Shop (`"shop"`):**
- State label: "Shop"
- Run Summary base view
- Gold visually emphasized (larger or highlighted — it's the key resource here)
- Potion slot capacity shown: "N potions held" (slot count not reliably available from API — show held count only)

**Rest Site (`"rest_site"`):**
- State label: "Campfire"
- Run Summary base view
- Deck composition visible (relevant for upgrade decisions)

**Event (`"event"`):**
- State label: "Event"
- Run Summary base view (event choices aren't exposed by the API)

**Selection Overlays (`"card_select"`, `"relic_select"`, `"bundle_select"`):**
- State label: "Choosing Card" / "Choosing Relic" / "Choosing Bundle"
- Run Summary base view

**Hand Select (`"hand_select"`):**
- This occurs mid-combat (e.g., exhaust prompts). Pass through to combat view — do not switch to non-combat layout.

**Menu (`"menu"`):**
- State label: "Main Menu"
- Show "No active run" message. Hide all run-specific content.

**Unknown / Fallback (any unrecognized string):**
- Show Run Summary base view
- State label: raw `stateType` string, capitalized (informative rather than blank)
- Never a blank sidebar when connected

### Deck Composition Summary Component

A new `DeckSummary` component derived from the existing deck data (ignoring pile locations, counting all cards):
- Total deck size
- Type breakdown: N attacks, N skills, N powers, N curses
- Average card cost

This data is computable from `extended` without any new API fields.

## Acceptance Criteria

- [ ] When `stateType !== "combat"` (and not `"hand_select"`), combat-specific sections (enemy list, buff bar, draw odds, recommendation panel) are hidden.
- [ ] `"hand_select"` state passes through to combat view (it's a mid-combat overlay).
- [ ] In every non-combat state (except `"menu"`), the sidebar shows at minimum: HP, gold, relics, potions, and deck composition summary.
- [ ] `"menu"` state shows "No active run" message with no run-specific content.
- [ ] Each non-combat state shows a visible, contextual state label (e.g., "Campfire", "Choosing Card Reward", "Shop").
- [ ] In `"card_reward"` state, deck type breakdown (attack/skill/power counts) and average cost are prominently displayed.
- [ ] In `"shop"` state, gold is visually emphasized and held potion count is shown.
- [ ] `"rest_site"` shows deck composition (relevant for upgrade decisions).
- [ ] Selection overlays (`"card_select"`, `"relic_select"`, `"bundle_select"`) show contextual labels and run summary.
- [ ] Unknown/unhandled state types degrade gracefully (run summary + raw state label), never a blank body.
- [ ] State transitions (e.g., combat ending → map) update the sidebar within one polling cycle (~500ms) without user interaction.

## Technical Approach

**Primary file:** `src/components/DeckTracker.tsx` — the main sidebar component where state branching is added.

**Gate already exists:** `src/engine/recommend.ts` line 21 already guards on `stateType !== "combat"`. The same `stateType` from `ExtendedGameInfo` (in `src/hooks/useGameState.ts`) drives the new branching.

**New component:** `src/components/DeckSummary.tsx` — computes type counts and average cost from the deck array (pile locations ignored). Reusable across Map, Reward, and Shop views.

**Relic display extraction:** The relic list (currently inside BuffsBar, which is combat-only) should be extracted into a standalone `RelicList` component so it can be used in the run overview.

**State type strings:** The Rust backend normalizes "monster", "elite", "boss" → "combat" but passes other states through raw. The STS2MCP API (verified from `McpMod.StateBuilder.cs`) sends: `"map"`, `"shop"`, `"rest_site"`, `"event"`, `"card_reward"`, `"rewards"`, `"card_select"`, `"relic_select"`, `"bundle_select"`, `"hand_select"`, `"treasure"`, `"menu"`, `"unknown"`. The `"hand_select"` state is a mid-combat overlay and should pass through to combat view.

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

## Resolved Questions

- **State type strings:** Verified from STS2MCP source (`McpMod.StateBuilder.cs`). Card reward is `"card_reward"` (not "reward"), shop is `"shop"` (not "shop_room"). Full list documented in the state type table above.
- **Potion slot capacity:** The API provides held potions but not total slot count (varies by relic). Decision: show held count only (e.g., "2 potions"), not "2 / 3".

## Open Questions

- **Relic display during combat:** If relics are extracted into a standalone component, should they also be shown in the combat view? Currently they're in BuffsBar — verify whether this is intentional.
