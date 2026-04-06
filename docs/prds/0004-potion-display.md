# 0004 — Individual Potion Display with Tooltips

**Status:** Implemented
**Effort:** S
**Confidence:** High

## Problem

The player status area shows only "2 pots" — a count. The full potion data is available from the hook (`AppPotion[]` with `id`, `name`, `description`, `slot`, `can_use`), but it's not rendered. The user cannot see which potions they have without looking at the game window, and has no way to know if a potion is usable in the current context.

## User Stories

- As a player, I want to see my individual potions by name in the sidebar, so I don't have to switch focus to the game window to remember what I have.
- As a player, I want to know which potions I can use right now versus which are locked, so I can plan my turn accurately.
- As a player, I want to hover a potion to read its full description and usability status, so I can make informed decisions.

## Solution

Replace the "N pots" count with a row of individual potion pill badges, reusing the existing `RelicPill` pattern from `DeckTracker.tsx`. Each pill shows the potion name; hovering reveals a portal-based tooltip with name, description, and usability status.

**Layout within PlayerStatus:**

```
[Character name]          [HP numbers]
[====== HP bar ======]
[Energy] [Gold]
[Pill: Fire Potion] [Pill: Block Potion] [Pill(dim): Regen Potion]
```

Potions move to their own row beneath the stats row (rather than cramming into the energy/gold line). The row is hidden when the potions array is empty.

**Usability states:**
- **Usable** (`can_use: true`): Solid background, full-contrast text, colored/normal dot.
- **Unusable** (`can_use: false`): Dimmed text, transparent/near-transparent background, dashed border, gray dot. This uses a shape-based cue (dashed border) in addition to color, for accessibility.

**Tooltip content** (on hover or keyboard focus):
- Potion name (bold)
- Full description
- "Ready to use" (green) or "Cannot use now" (red) badge

Potions are sorted by `slot` to match the in-game layout.

## Acceptance Criteria

- [x] Each potion in `extended.potions` is rendered individually with its name visible without any interaction.
- [x] Potions with `can_use: false` are visually distinct from usable potions (dashed border, not solely color).
- [x] Hovering a potion pill shows a tooltip with: potion name, full description, and usability status.
- [x] The potion row is not rendered when the potions array is empty.
- [x] Pills wrap gracefully when names are long (text truncation with ellipsis).
- [x] Tooltips do not clip outside the application window (reposition when near viewport edges).
- [x] Each pill is keyboard-focusable and shows its tooltip on focus.

## Technical Approach

**Primary reuse target:** `RelicPill` component in `DeckTracker.tsx` (lines 245-281) — portal-based tooltip with hover state and viewport-edge positioning. Create a `PotionPill` component following the same pattern.

**Data source:** `extended.potions` from `useGameStateContext()` — no additional fetching needed. All required fields (`id`, `name`, `description`, `slot`, `can_use`) are already available.

**Files to change:**
- `src/components/PlayerStatus.tsx` — replace "N pots" count with the new `PotionPill` row
- New `src/components/PotionPill.tsx` — pill component with tooltip (modeled on RelicPill)

**Conditional rendering:** The potion row renders only when `extended.potions.length > 0`, matching the existing conditional pattern in PlayerStatus.

## Scope

**In:**
- Individual potion pills with names and hover tooltips in PlayerStatus.
- Visual distinction between usable and unusable potions.
- Sorting by slot index.

**Out:**
- Potion click-to-use interaction (the game handles potion use; the sidebar is read-only).
- Color-coding by potion type (requires a potion ID → color mapping; not in available API data — omit colored dot if mapping unavailable).
- Potion simulation in the recommendation engine (covered by PRD 0006).

## Open Questions

- The colored dot per potion type is a nice-to-have but requires a name/ID-to-color mapping not available in the API data. Omit for MVP; add later if the API exposes potion type categories.
- Does `can_use` accurately reflect usability during the play phase in live game data? Needs verification.
