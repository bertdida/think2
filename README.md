# think2

**think2** is a small web app for **stress-tested recommendations**: you describe your situation once; **two AI models** plan and challenge; a **third** resolves the exchange into a clear **verdict**, **next steps**, and **risks**.

The exchange streams step by step. At the end you get a structured answer (verdict, actions, risks).

---

## How to use it

1. Open **`index.html`** in a modern browser (or host the repo on any static site). Use **`demo.html`** for a **scripted walkthrough** (one sample situation, no OpenRouter calls). The header on each page links to the other.
2. Paste your **[OpenRouter](https://openrouter.ai/) API key**. It is **only used in your browser** to call OpenRouter. It is **not saved** and disappears when you reload the page.
3. Choose **Planner**, **Challenger**, and **Resolver** models (defaults are sensible; your choices are remembered in the browser).
4. Write **your situation** — what is going on, what you have tried, what you want decided. Use **Next sample** or **Clear** if you want quick examples or a blank field.
5. Click **Get my recommendation** and read **how we got there** as it streams.

**New session** clears the run and your situation text; your key field is not stored anyway.

---

## What you need

- For **`index.html`**: an **OpenRouter account** and API key ([OpenRouter docs](https://openrouter.ai/docs/api/reference/overview)).
- For **`demo.html`**: nothing except a modern browser (no key, no network to OpenRouter).
- A browser with **JavaScript** enabled.

There is **no server** and **no build step** — static **HTML**, **CSS** (`css/styles.css`), and **JavaScript** (`js/`).

---

## Tech

- **Layout:** `index.html` (live app) and `demo.html` (canned demo); shared **`css/styles.css`**, **`js/shared.js`** (UI helpers), plus **`js/app.js`** (OpenRouter) or **`js/demo.js`** (offline script).
- **API:** The live app uses direct `fetch` to OpenRouter (`/api/v1/chat/completions` with streaming, and `/api/v1/models` to validate model IDs). The demo page does not call OpenRouter.
- **Themes:** Respects **light / dark** using your system preference (`prefers-color-scheme`).

---

## Privacy (short version)

- Your **API key** and **situation text** stay in the page session. Nothing is sent to a think2 server — there isn’t one.
- Only **OpenRouter** receives the key and the prompts you send when you run a session from **`index.html`**.
- **`demo.html`** does not send your situation or any key to OpenRouter (canned text only, in the browser).

---

## Repository

Source and issues: **[github.com/bertdida/think2](https://github.com/bertdida/think2)**  

The same link appears in the **site header** on [think2.xyz](https://think2.xyz).

---

## Local preview

From this folder, serve the file so API calls are not blocked by browser rules (some browsers restrict `file://`):

```bash
# Example with Python
python3 -m http.server 8080
```

Then open `http://localhost:8080/index.html` (live app) or `http://localhost:8080/demo.html` (demo).

---

## Name & domain

- **App name:** think2 (lowercase in the UI).
- **Domain:** [think2.xyz](https://think2.xyz) — used in OpenRouter attribution headers when calling the API.
