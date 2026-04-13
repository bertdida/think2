---
name: Brief Clear + Random
overview: "Add Clear + Random sample briefs under the brief field in [index.html](index.html). Shorten placeholder. Gate auto-scroll during streaming (and new-round scroll) so the page only follows the bottom when the user is already pinned there—otherwise they can finish reading without being pulled."
todos:
  - id: css-brief-actions
    content: Add `.brief-actions` + secondary `.brief-action` button styles + `:focus-visible` in index.html `<style>`
    status: completed
  - id: html-buttons
    content: Insert button row below `#brief` textarea in the council form
    status: completed
  - id: js-samples-wire
    content: Add SAMPLE_BRIEFS (10), pickRandomBrief, Clear/Random listeners near other button wiring
    status: completed
  - id: js-scroll-pin
    content: "Scroll only if document is near bottom: helper + gate flushScroll; gate card.scrollIntoView in runRound"
    status: completed
isProject: false
---

# Plan: Brief “Clear” + “Random example” + conditional scroll

## Scope

- Single file: [`index.html`](index.html).
- **HTML**: After `#brief` `<textarea>`, add a small row with two `type="button"` controls (so they never submit the form): **Clear** and **Random** (label can be “Random brief” / “Random example” — pick one short string).
- **CSS**: New utility row (e.g. `.brief-actions`) — flex, gap, align with existing light theme (`--border`, `--link`, `--text`). Style buttons as **secondary** (outline or text+underline) so they stay visually below **Start the council** (`.btn-start` remains the single strong primary).
- **JS**:
  - `const SAMPLE_BRIEFS = [ ... ]` — **10 strings**, each 3–6 sentences, **relatable** and **diverse** (e.g. gym habit, side project stuck at 90%, job search + networking dread, money tradeoff vacation vs savings, learning course not finished, scope creep on a small product, difficult coworker / boundary, family schedule + deep work). Include the **gym** copy the user liked as one entry.
  - `pickRandomBrief()` — `Math.random()` index; if `SAMPLE_BRIEFS.length > 1` and chosen text **equals** current `textarea.value`, **re-roll once** (or pick `(i+1)%n`) to reduce back-to-back duplicates.
  - **Clear** — `brief.value = ""`.
  - **Random** — set `brief.value = pickRandomBrief()`; optionally `brief.focus()` and set selection to end for quick edits.
  - Wire `click` listeners next to existing [`btnStart` / `btnReset` listeners](index.html) (~1124–1125).

## Auto-scroll (pin-to-bottom)

**Problem:** [`createStreamRenderer`](index.html) schedules `flushScroll` which sets `document.scrollingElement.scrollTop = scrollHeight` on every batched token update, so readers cannot stay on earlier rounds.

**Behavior:** Only auto-scroll when the user is already **at (or near) the bottom** of the document—i.e. they are “following” the live stream. If they have scrolled up to read an earlier card, **do not** change `scrollTop` on new tokens.

**Implementation:**

1. Add a small helper, e.g. `isDocumentPinnedToBottom(root, tolerancePx)`:
   - `root = document.scrollingElement` (usually `document.documentElement`).
   - Treat as pinned when `root.scrollHeight - root.scrollTop - root.clientHeight <= tolerance` (suggest **48–80px** tolerance for subpixel / fractional heights).
2. In **`flushScroll`** (inside `createStreamRenderer`, ~921–925): call `scrollTop = scrollHeight` **only if** `isDocumentPinnedToBottom(root, tolerance)`; otherwise no-op.
3. **`runRound`** (~978): today `card.scrollIntoView({ behavior: "smooth", block: "end" })` when each new round card mounts—this also yanks users who are reading above. Apply the **same gate**: only `scrollIntoView` when pinned to bottom; if not pinned, leave scroll position unchanged so they can finish reading. (First visit / top of page: user is effectively pinned, so new rounds still scroll into view as today.)

**Unchanged:** `resetSession` continues to `window.scrollTo({ top: 0, behavior: "smooth" })` after clearing—explicit user action.

## Copy / UX details

- Replace the long TikTok-style [`placeholder`](index.html) (~570) with a **short** hint (one line): context + constraint + what you want decided — avoids huge placeholder on mobile.
- **Accessibility**: buttons need visible focus (`:focus-visible` using existing focus pattern: border or box-shadow consistent with inputs).
- **No** label-row chrome; controls live **only** under the textarea as requested.

## Out of scope

- Persisting last random choice, analytics, or changing `ROUNDS` / API flow.
- `resetSession` already clears `#brief` — no change required unless you want Random/Clear disabled during an active run (optional; default: leave enabled).

## Verification

- Manual: Clear with prefilled text; Random several times; Random then Start (with key) still works; New session still clears brief.
- Scroll: Start a run, scroll up to read round 1 while round 2 streams—page should **not** jump; scroll to bottom—streaming should **resume** following. New round card should not `scrollIntoView` while scrolled up.
