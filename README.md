# think2

**think2** is a small web app that helps you think through a problem with **two AI models** arguing different sides, then a **third model** summarizing the debate into a clear verdict and next steps.

You describe your situation once. The models debate over several rounds. At the end you get a structured answer (verdict, actions, risks).

---

## How to use it

1. Open **`index.html`** in a modern browser (or host the file on any static site).
2. Paste your **[OpenRouter](https://openrouter.ai/) API key**. It is **only used in your browser** to call OpenRouter. It is **not saved** and disappears when you reload the page.
3. Choose **Strategist**, **Critic**, and **Synthesizer** models (defaults are sensible; your choices are remembered in the browser).
4. Write your **brief** — what is going on, what you have tried, what you want decided. Use **Random brief** or **Clear** if you want quick examples or a blank field.
5. Click **Start the council** and read the debate as it streams.

**New session** clears the debate and your brief; your key field is not stored anyway.

---

## What you need

- An **OpenRouter account** and API key ([OpenRouter docs](https://openrouter.ai/docs/api/reference/overview)).
- A browser with **JavaScript** enabled.

There is **no server** and **no build step** — just this repo’s HTML file.

---

## Tech

- **Single file:** `index.html` (HTML, CSS, and JS together).
- **API:** Direct `fetch` to OpenRouter (`/api/v1/chat/completions` with streaming, and `/api/v1/models` to validate model IDs).
- **Themes:** Respects **light / dark** using your system preference (`prefers-color-scheme`).

---

## Privacy (short version)

- Your **API key** and **brief** stay in the page session. Nothing is sent to a think2 server — there isn’t one.
- Only **OpenRouter** receives the key and the prompts you send when you run a session.

---

## Repository

Replace this with your real GitHub URL once the repo is public:

**[Your GitHub repository →](https://github.com/YOUR_USER_OR_ORG/think2)**  

The live site can also show the same link in the **header** for visitors who want source or issues.

---

## Local preview

From this folder, serve the file so API calls are not blocked by browser rules (some browsers restrict `file://`):

```bash
# Example with Python
python3 -m http.server 8080
```

Then open `http://localhost:8080/` and use `index.html` as the entry (e.g. `http://localhost:8080/index.html`).

---

## Name & domain

- **App name:** think2 (lowercase in the UI).
- **Domain:** [think2.xyz](https://think2.xyz) — used in OpenRouter attribution headers when calling the API.
