---
name: Demo mode + shared assets
overview: Add `demo.html` with a single canned scenario, visible fake API key, no OpenRouter traffic, and simulated streaming. Refactor only reusable CSS and JS into shared files; keep page-specific orchestration in per-page scripts.
todos:
  - id: extract-css
    content: Move `<style>` from index.html to css/styles.css; link from index.html and demo.html
    status: pending
  - id: extract-shared-js
    content: "Add js/shared.js: escapeHtml, createStreamRenderer, scroll helper, appendRoundCard(roundDisplay)"
    status: pending
  - id: extract-app-js
    content: Move remaining index logic to js/app.js; refactor runRound to use appendRoundCard
    status: pending
  - id: demo-html-js
    content: "Add demo.html + js/demo.js: fixed UI, DEMO_ROUNDS, fake streaming, no fetch"
    status: pending
  - id: readme
    content: Update README for multi-file layout and demo.html usage
    status: pending
isProject: false
---

# Demo page and selective asset split

## Context

Today everything lives in [`index.html`](index.html): large `<style>` block, inline `<script>`, 9-round debate with real `fetch` to OpenRouter, and [`SAMPLE_BRIEFS`](index.html) for “Next sample”. README currently describes a **single-file** deployment.

## Recommended split (aligned with “extract only if reusable”)

| Asset                                                           | Rationale                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`css/styles.css`**                                            | Identical look for `index.html` and `demo.html`; one place for theme tokens and layout.                                                                                                                                                                                                                                                                                                |
| **`js/shared.js`** (non-module, global `function` declarations) | Small set of utilities both pages need: `escapeHtml`, `createStreamRenderer`, `isDocumentPinnedToBottom`, and a new **`appendRoundCard(roundDisplay)`** that encapsulates the DOM fragment currently built inside `runRound` (card shell + header + typing + content container). Avoids `type="module"` so **file://** still works for local opens.                                    |
| **`js/app.js`**                                                 | All OpenRouter-specific logic, `ROUNDS`, `startDebate`, model fills, storage, API key toggle — moved out of `index.html` but unchanged in behavior. `runRound` calls shared `appendRoundCard` then does fetch/stream/usage as today.                                                                                                                                                   |
| **`js/demo.js`**                                                | Demo-only: fixed brief text, pre-filled `sk-or-v1-demo`, read-only or static situation UI, **`DEMO_ROUNDS`** canned strings\*\* (9 intermediate + resolver text in the same style as live output), sequential “fake stream” using existing `createStreamRenderer`, no `fetch`, hide or stub session usage (e.g. leave usage footer off or a single “Demo — no OpenRouter usage” line). |

What **not** to extract: `ROUNDS` with `buildMessages`, OpenRouter helpers, model list fetch, localStorage wiring — only `index` needs those.

## `demo.html` UX (one fixed path)

- **Situation**: One predefined brief (can be the first entry from today’s samples or a slightly shortened copy); **read-only** `<textarea>` or a `<p class="brief-readonly">` so “Next sample” / “Clear” are **removed** or hidden.
- **API key**: Input shows `sk-or-v1-demo`, **`type="text"`** (always visible) **or** `password` with toggle forced to “shown” on load — your call in implementation; simplest is `type="text"` + optional note “Not a real key.”
- **Models**: Either **disabled** `<select>`s with fixed labels matching current defaults, or static text (“Planner / Challenger / Resolver models are fixed in this demo”) to avoid implying keys are validated.
- **Primary CTA**: Same label as prod (“Get my recommendation”); on click, run the canned 9-step timeline with short artificial delays so it **feels** like streaming without network.
- **Copy / SEO**: Title and meta description should state **demo / no API key required** so it is not confused with the real app page.

## Wiring `index.html` / `demo.html`

Both become thin shells: `<link rel="stylesheet" href="css/styles.css">`, then `<script src="js/shared.js">` followed by `<script src="js/app.js">` or `<script src="js/demo.js">`.

## Where “demo” lives (URL + on-page placement)

- **URL / file**: [`demo.html`](demo.html) at repo root (same level as [`index.html`](index.html)), per earlier plan.
- **Link on the real app (`index.html`)**: **Site header**, beside the existing GitHub link — e.g. a text link `Demo` → `demo.html` (same row as `think2` title + `GitHub`, using the same header styling so it feels like primary nav). This is the default unless you want the demo URL undocumented (README-only).
- **Link on the demo page (`demo.html`)**: Same header pattern with **`Live app`** or **`Use your key`** → `index.html` so people can jump to the full flow after trying the canned run.

## Docs and discoverability

- Update [`README.md`](README.md): replace “single `index.html`” with **multi-file static** layout and document `demo.html`.
- Header cross-links as above; README can mention “try Demo in the header” for consistency.

## Content work (largest manual effort)

Author **`DEMO_ROUNDS`**: nine strings (r1–r8 planner/challenger tone, r9 resolver with **VERDICT / KEY ACTIONS / WATCH OUT FOR** matching the format in [`index.html` resolver round](index.html)) consistent with the single chosen brief. No need to wire transcript dependencies between rounds for API prompts — only the **display** text needs to read coherently for a human.

## Risks / checks

- **Relative paths**: Works on GitHub Pages and any static host; both HTML files in repo root reference `css/` and `js/` the same way.
- **Do not** call OpenRouter with `sk-or-v1-demo`; demo page should never hit the network for chat/models (guard in `demo.js` even if someone edits the field).
