---
name: Advice-first copy pass
overview: "Align public and in-app wording with the product truth: users want a stress-tested recommendation. Primary CTA: Get my recommendation. Update meta/SEO, footer, form labels, transcript accessibility text, and user-visible error/usage strings in [index.html](index.html) and mirror in [README.md](README.md). No LLM system-prompt changes; no renames of internal IDs or CSS hooks."
todos:
  - id: meta-head
    content: Update index.html title, meta description, og/twitter tags, and JSON-LD description to advice-first copy (consistent story + privacy).
    status: completed
  - id: body-footer
    content: "Update form labels, placeholder, sample button, primary CTA (Get my recommendation), transcript aria-label, and footer paragraph in index.html."
    status: completed
  - id: js-strings
    content: Align user-visible JS strings (validation error, step failure message, usage copy) with new terminology.
    status: completed
  - id: readme
    content: "Rewrite README intro and how-to steps to match the same framing, field names, and primary CTA (Get my recommendation)."
    status: completed
isProject: false
---

# Advice-first terminology and copy

## Primary CTA (selected)

Use exactly: **Get my recommendation**

- Replaces the current **Start the debate** button label in [index.html](index.html) and the matching step in [README.md](README.md).
- **Why this one:** states the **outcome** (a recommendation), “my” aligns with **your situation**, and it is still short enough for a primary button without sounding generic (vs. **Get recommendation**).

## Recommendation (what “best” means here)

- **Promise:** clear, stress-tested **recommendation** (verdict, actions, risks)—not “watch a debate.”
- **Mechanism (one clause):** one model proposes a plan, another challenges it, a third synthesizes—keep this in descriptions, not “eight rounds / three defenses” in meta (too technical for first contact).
- **Roles:** keep **Strategist / Critic / Synthesizer** in the UI so labels stay aligned with [ROUNDS](index.html) `speaker` values and model behavior; the win is elsewhere (CTA, brief wording, SEO).
- **Scope boundary:** edit **user-visible strings and meta only**. Leave `debateForm`, `debateTranscriptThrough`, `.debate`, `modelKey` names, and LLM `system` / `buildMessages` text **unchanged** (prompts already match advice; transcript header `BRIEF:` is model-internal and stable).

## Files to change

- Primary: [index.html](index.html) (head meta, JSON-LD, main form, transcript section `aria-label`, footer, a few JS strings shown to users).
- Docs: [README.md](README.md) (intro + how-to steps aligned with new wording).

## Concrete string targets

### Head / sharing (index.html lines ~7–34)

| Slot                                         | Direction                                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                                      | `think2 — stress-tested advice: two AIs, one clear verdict`                                                                           |
| `meta name="description"` + `og:description` | One paragraph: situation once → plan → challenge → synthesize → verdict / actions / risks; OpenRouter key in browser only, not saved. |
| `og:title` / `twitter:title`                 | Match `title` (or shorten slightly if length is a concern—keep consistent across OG/Twitter).                                         |
| `twitter:description`                        | Short second-person variant of the same story + key line.                                                                             |
| JSON-LD `description`                        | Same product story; keep `url`, `offers`, `browserRequirements` as today.                                                             |

### In-page copy (index.html body ~735–830)

- **Brief field:** label from “Your brief — situation or problem” → **“Your situation”** (subtitle optional: “what’s going on, what you’ve tried, what you want decided” in placeholder only to avoid long labels).
- **Placeholder:** keep intent; e.g. lead with “Describe what’s going on…” (same fields as today).
- **“Next sample brief”** → **“Next sample”** (or “Next sample situation”) so “brief” is not the dominant word.
- **Primary button:** “Start the debate” → **“Get my recommendation”** (locked; see [Primary CTA (selected)](#primary-cta-selected)).
- **Transcript section:** `aria-label="Debate transcript"` → **“How we got there”** or **“Recommendation steps”** (pick one; both are advice-first).
- **Footer:** replace “two AIs debate your brief” with the same one-line story as meta (stress-test → verdict / next steps).

### JS user-visible strings (same file, script section)

- `showError("Write your brief first.")` → align with new field wording, e.g. **“Describe your situation first.”**
- `showError(\`Round failed: …\`)` → **“This step failed: …”** (or “Request failed” if you want less wizard-of-oz).
- Usage copy: **“Usage unavailable from API for this round.”** → **“…for this step.”**; session summary lines that say **“X rounds”** → **“X steps”** for end-user tone ([renderSessionUsageSummary](index.html) / related strings only—no change to aggregation logic).

### README.md

- Opening paragraph: same advice-first framing (replace “structured AI debate” as the lead noun phrase with stress-tested recommendation / plan + challenge + synthesize).
- Steps 4–5: match new labels (situation field, button text, transcript wording).
- “New session” bullet: “clears the session and your situation” (or “your input”) instead of “debate and your brief” if you drop “brief” in UX.

## Verification

- Manual: open `index.html`, confirm title in tab, form labels, button, footer, and run a session to see error strings and usage footer if applicable.
- Grep sanity: ensure no stale user-facing “debate your brief” in `index.html` / `README.md` unless intentionally kept in one SEO variant (default: remove for consistency).

## Out of scope (explicit)

- Changing `ROUNDS[].label` / `speaker` / `DEBATE_TRANSCRIPT_ROUNDS` (visible badge text could be a follow-up if you want “Step” instead of “Round” everywhere).
- Renaming `id="brief"` or form `id="debateForm"` (breaks nothing if unchanged; renames need JS grep for all references).
- OpenRouter `X-OpenRouter-Title` / category tweaks.
