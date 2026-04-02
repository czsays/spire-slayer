

## Fix MiniCard clipping

The MiniCard component at line 182 has content overflowing the sidebar because the inner flex layout doesn't constrain properly. The draw odds and pile counts section pushes beyond the container.

### Changes to `src/components/DeckTracker.tsx`

1. **Add `overflow-hidden` to the MiniCard root** (line 184) to prevent any content from visually clipping outside the card boundary.

2. **Ensure the main row uses `min-w-0` on the outer flex container** (line 188) — it already has `gap-2` and `justify-between`, but the left side needs to shrink. The left `div` at line 189 already has `min-w-0`, which is correct.

3. **Add `min-w-0` to the card name/description wrapper** at line 194 — already present, good.

4. **The key fix**: The draw odds column (line 207) with `flex-shrink-0` prevents the layout from fitting. Change the right-side stats to use a fixed small width or allow it to shrink, and ensure the card name truncates properly by adding `overflow-hidden` to the outer card div and ensuring the flex container at line 188 also has `min-w-0`.

Specific edits:
- Line 184: Add `overflow-hidden` to the MiniCard root class
- Line 188: Add `min-w-0` to the outer flex row
- Line 196: Ensure the card name span has `max-w-[120px]` or similar constraint, or rely on existing `truncate` + proper `min-w-0` chain

This ensures the entire card row stays within the 360px sidebar bounds.

