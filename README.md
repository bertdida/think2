# think2

**think2** is a small web app for **stress-tested recommendations**: you describe your situation once; **two AI models** plan and challenge; a **third** resolves the exchange into a clear **verdict**, **next steps**, and **risks**.

The exchange streams step by step. At the end you get a structured answer (verdict, actions, risks).

---

## How to use it

1. Open the **live app** (`/` or `index.html`) or the **demo** (`/demo.html`) for a scripted walkthrough (one sample situation, no OpenRouter calls). The header on each page links to the other.
2. Paste your **[OpenRouter](https://openrouter.ai/) API key**. It is **only used in your browser** to call OpenRouter. It is **not saved** and disappears when you reload the page.
3. Choose **Planner**, **Challenger**, and **Resolver** models (defaults are sensible; your choices are remembered in the browser).
4. Write **your situation** — what is going on, what you have tried, what you want decided. Use **Next sample** or **Clear** if you want quick examples or a blank field.
5. Click **Get my recommendation** and read **how we got there** as it streams.

**New session** clears the run and your situation text; your key field is not stored anyway.

---

## What you need

- For the **live app**: an **OpenRouter account** and API key ([OpenRouter docs](https://openrouter.ai/docs/api/reference/overview)).
- For the **demo**: nothing except a modern browser (no key, no network to OpenRouter).
- A browser with **JavaScript** enabled.

There is **no backend** — the shipped site is static HTML, CSS, and bundled JavaScript. Source lives in TypeScript under [`src/`](src/) and is built with **Vite**.

---

## Tech

- **Build:** [Vite](https://vitejs.dev/) 6, TypeScript (strict), multi-page entries [`index.html`](index.html) and [`demo.html`](demo.html).
- **Source:** [`src/lib/shared.ts`](src/lib/shared.ts) (UI helpers), [`src/lib/app.ts`](src/lib/app.ts) (OpenRouter), [`src/lib/demo.ts`](src/lib/demo.ts) (offline demo); shared styles [`css/styles.css`](css/styles.css).
- **API:** The live app uses direct `fetch` to OpenRouter (`/api/v1/chat/completions` with streaming, and `/api/v1/models` to validate model IDs). The demo page does not call OpenRouter.
- **Themes:** Respects **light / dark** using your system preference (`prefers-color-scheme`).

---

## Privacy (short version)

- Your **API key** and **situation text** stay in the page session. Nothing is sent to a think2 server — there isn’t one.
- Only **OpenRouter** receives the key and the prompts you send when you run a session from the **live app**.
- The **demo** does not send your situation or any key to OpenRouter (canned text only, in the browser).

---

## Repository

Source and issues: **[github.com/bertdida/think2](https://github.com/bertdida/think2)**

The same link appears in the **site header** on [think2.xyz](https://think2.xyz).

---

## Development

```bash
npm install
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # Typecheck + production bundle to dist/
npm run preview  # Serve dist/ locally
npm test         # Vitest
npm run lint     # ESLint
npm run format   # Prettier
```

---

## Deploy (GitHub Pages)

1. In the repo on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Pushes to **`main`** run [`.github/workflows/pages.yml`](.github/workflows/pages.yml): `npm ci`, `npm run build`, then upload **`dist/`** to Pages.

The site uses the apex domain **think2.xyz**; Vite `base` is **`/`**.

---

## Name & domain

- **App name:** think2 (lowercase in the UI).
- **Domain:** [think2.xyz](https://think2.xyz) — used in OpenRouter attribution headers when calling the API.
