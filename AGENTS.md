# AGENTS.md — working on think2

Orientation for coding agents and contributors. The shipped product is a **static multi-page site** (no app server): OpenRouter is called **from the browser** on the live page only.

## Commands

| Command | Purpose |
|--------|---------|
| `npm install` | Install devDependencies |
| `npm run dev` | Vite dev server (default port 5173 unless taken) |
| `npm run build` | `tsc --noEmit` then production bundle to `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm test` | Vitest (`vitest run`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | Typecheck only |

CI deploy: [`.github/workflows/pages.yml`](.github/workflows/pages.yml) runs `npm run lint`, `npm test`, then `npm run build`, and publishes `dist/` to GitHub Pages (`base: "/"` in [`vite.config.ts`](vite.config.ts)).

## Entry points

- **Live app:** [`index.html`](index.html) → [`src/entries/index.ts`](src/entries/index.ts) → mounts shell, then [`src/lib/app.ts`](src/lib/app.ts) `bootstrapLiveApp()`.
- **Demo:** [`demo.html`](demo.html) → [`src/entries/demo.ts`](src/entries/demo.ts) → mounts shell, then [`src/lib/demo.ts`](src/lib/demo.ts) `bootstrapDemoApp()`.

Each HTML file keeps **only** `<main id="main"></main>` for the interactive region; the rest of that region is filled at runtime.

## Shared UI (keep live + demo in sync)

- **[`src/lib/page-shell.ts`](src/lib/page-shell.ts)** — `mountThink2Page(main, "live" | "demo")` injects the full main-column markup (setup form, timeline, session usage, share actions, share banners). **Add or change shared DOM here** so both pages stay aligned.
- **Live-only behavior** lives in [`src/lib/app.ts`](src/lib/app.ts).
- **Demo-only behavior** (readonly brief, canned text, illustrative usage, `source: "demo"` in share payloads) lives in [`src/lib/demo.ts`](src/lib/demo.ts).

## Core modules (`src/lib/`)

| Module | Role |
|--------|------|
| [`debate-rounds.ts`](src/lib/debate-rounds.ts) | Round definitions, prompts, `ROUNDS` — single source for debate shape |
| [`model-selects.ts`](src/lib/model-selects.ts) | Model preset list, `fillSelect` / `setupModelSelects`, `fillSelectDisabled` (demo) |
| [`shared.ts`](src/lib/shared.ts) | DOM helpers: `appendRoundCard`, stream renderer, `escapeHtml` |
| [`openrouter-usage.ts`](src/lib/openrouter-usage.ts) | Parse OpenRouter usage objects |
| [`usage-display.ts`](src/lib/usage-display.ts) | Per-card usage footer + session totals block |
| [`share-payload.ts`](src/lib/share-payload.ts) | Share URL payload encode/decode (gzip + base64url in hash) |
| [`share-view.ts`](src/lib/share-view.ts) | Read-only share viewer UI, `wireShareViewer`, session “done” chrome |
| [`share-bootstrap.ts`](src/lib/share-bootstrap.ts) | `loadSharePayloadFromLocation()` for `#v1.` hashes |

## Styling

- Global styles: [`css/styles.css`](css/styles.css) (imported from entries).

## Tests

- Colocated: `*.test.ts` next to implementation (e.g. [`share-payload.test.ts`](src/lib/share-payload.test.ts)).
- Gzip roundtrip tests skip when `CompressionStream` is unavailable.

## Conventions

- **TypeScript:** strict; avoid `any`.
- **Scope:** Prefer small, targeted changes; extend existing patterns (`page-shell`, shared lib) rather than duplicating HTML across `index.html` / `demo.html`.
- **Secrets:** API keys never go in repo code; share links embed user content in the URL hash (privacy implication documented in UI copy).

## User-facing docs

- Product overview and deploy notes: [`README.md`](README.md).
