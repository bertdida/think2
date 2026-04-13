---
name: Planner Challenger Resolver labels
overview: Rename user-facing roles to Planner, Challenger, and Resolver; tighten the page title to drop “two AIs”; replace the footer lead with “plan it, challenge it, resolve it”; set the Resolver row sublabel to “Final step — resolution”; align transcript labels and the final-round card copy with the new names. Keep internal JS keys, DOM ids, storage keys, and CSS class names (`strategist`, `critic`, `synthesis`) unchanged.
todos:
  - id: html-head-footer
    content: Update index.html title/og/twitter titles, footer tagline, and form labels + Resolver sublabel.
    status: completed
  - id: rounds-transcript
    content: Update ROUNDS speaker (and r9 label/copy), DEBATE_TRANSCRIPT_ROUNDS prefixes; align r9 and optional challenger wording in user messages.
    status: completed
  - id: readme-meta
    content: Update README model names; optionally JSON-LD + twitter:description for Resolver wording.
    status: completed
isProject: false
---

# Planner / Challenger / Resolver label pass

## Decisions (locked from your spec)

- **Visible roles:** Strategist → **Planner**, Critic → **Challenger**, Synthesizer → **Resolver**.
- **Page subtitle (`title`, `og:title`, `twitter:title`):** `think2 — stress-tested advice, one clear verdict` (remove **two AIs**).
- **Footer tagline:** replace the current **two AI perspectives** lead with **plan it, challenge it, resolve it**, then keep a short outcome clause (verdict + next steps / stress-tested advice). Exact punctuation can be one or two sentences; keep the existing [`think2.xyz`](https://think2.xyz/) link pattern in [index.html](index.html) (~824–828).
- **Resolver row sublabel** (yellow tag under the model `<select>`): **Final step — resolution** (was “Final step — verdict”).
- **Primary CTA:** unchanged — **Get my recommendation**.

## What stays internal (no rename)

To avoid breaking saved model choices and a wide CSS sweep, **do not** rename:

- `id="strategistModel"`, `criticModel`, `synthesizerModel` and `fillSelect(...)` targets in [index.html](index.html).
- `STORAGE_STRATEGIST` / `STORAGE_CRITIC` / `STORAGE_SYNTHESIZER` string values (`think2.strategistModel`, etc.).
- `models.strategist` / `critic` / `synthesizer`, `modelKey: "strategist" | "critic" | "synthesizer"`, and `cls: "strategist" | "critic" | "synthesis"` on `ROUNDS`.

Only **display strings** and **model-facing transcript headers** change.

## Code edits

### 1. [index.html](index.html) — head

- Set `title`, `og:title`, and `twitter:title` to **`think2 — stress-tested advice, one clear verdict`**.
- Optionally align **`twitter:description`** with Resolver wording (e.g. replace “synthesizes” with **resolves** or “turns … into”) so social copy matches the new role story; keep length similar.

### 2. [index.html](index.html) — form (~768–785)

- Labels: **Planner model**, **Challenger model**, **Resolver model**.
- Tags: **Planner**, **Challenger**; third tag **Final step — resolution**.

### 3. [index.html](index.html) — footer (~824–828)

- First clause after the em dash: **plan it, challenge it, resolve it** (lowercase after dash is fine to match current style).
- Second part: one line that still promises **stress-tested** outcome and **verdict + next steps** (merge or two lines as today).

### 4. [index.html](index.html) — `ROUNDS` (~913–1039)

- **`speaker`** strings: **Planner**, **Challenger**, **Resolver** (drives the visible name on each round card).
- **`label` for r9:** Prefer aligning with Resolver — e.g. **Final step — resolution** or **Resolution** (pick one; avoid duplicating awkwardly with the dropdown tag if both would read identically in the timeline).

### 5. [index.html](index.html) — `DEBATE_TRANSCRIPT_ROUNDS` (~881–889)

- Replace `STRATEGIST` / `CRITIC` prefixes with **PLANNER** / **CHALLENGER** so pasted transcript context matches UI role names (model behavior unchanged).

### 6. [index.html](index.html) — r9 user + system strings (optional but recommended)

- User message currently references “strategic debate” and “strategist defense passes” and “Synthesize” — tighten to **planner** / **challenger** / **resolve** language so the Resolver model’s instructions match labels (same output format: VERDICT / KEY ACTIONS / WATCH OUT FOR).
- System string for r9: same idea — **resolve** / **final recommendation** without contradicting “Resolver.”

### 7. [index.html](index.html) — earlier rounds (optional consistency)

- Where user `content` says **“the critic”** in defense prompts, consider **“the challenger”** for one voice (small string edits only; keep `CRITIC_SYSTEM` constant name as-is).

### 8. [README.md](README.md)

- Step 3: **Planner**, **Challenger**, **Resolver** instead of Strategist / Critic / Synthesizer.
- Intro line: adjust “two AI models / third model synthesizes” if it still says synthesize — align with **plan → challenge → resolve** in plain language.

### 9. JSON-LD `description` (optional)

- Light edit if it still says “synthesizer” or fights the new naming; keep factual (browser-only key).

## Verification

- Grep for user-visible **Strategist|Critic|Synthesizer** and **two AIs** in [index.html](index.html) and [README.md](README.md) (allowlist LLM internals if any remain by mistake).
- Smoke: open page, confirm three dropdown labels/tags, run one session, confirm timeline **speaker** names read Planner / Challenger / Resolver.
