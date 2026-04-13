import { appendRoundCard, createStreamRenderer } from "./shared.js";
import type { ModelKey } from "./debate-rounds.js";
import { fillSelectDisabled } from "./model-selects.js";
import type { ParsedUsage } from "./openrouter-usage.js";
import { loadSharePayloadFromLocation } from "./share-bootstrap.js";
import { startShareCopyLoading } from "./share-copy-ui.js";
import { buildSharePayload, type SharePayload } from "./share-payload.js";
import {
  primeShareUrlCache,
  resolveShareUrlForClipboard,
} from "./share-url-cache.js";
import {
  hideSessionDoneChrome,
  showSessionDoneChrome,
  showShareDecodeError,
  wireShareViewer,
} from "./share-view.js";
import {
  addUsageToSessionAgg,
  clearSessionUsageSummary,
  createEmptySessionUsageAgg,
  mountRoundUsageFooter,
  renderSessionUsageSummary,
  type SessionUsageStep,
} from "./usage-display.js";

const DEMO_BRIEF =
  "I want to be more consistent at the gym (3×/week) but I break the streak whenever work gets busy. I've tried apps and strict plans; they don't stick. What strategy actually works for someone who's motivated but chaotic?";

const DEMO_API_KEY = "sk-or-v1-demo";

interface DemoRoundStep {
  id: string;
  speaker: string;
  cls: string;
  label: string;
  text: string;
}

const DEMO_ROUNDS: DemoRoundStep[] = [
  {
    id: "r1",
    speaker: "Planner",
    cls: "strategist",
    label: "Round 1 — opening strategy",
    text:
      "Stop optimizing the perfect plan. Your failure mode is all-or-nothing after busy weeks, not lack of motivation.\n\n" +
      "- Pick three **non-negotiable** slots (e.g. Mon/Wed/Fri 7:15am) that are *before* work chaos, not after.\n" +
      '- Rule: **minimum viable session** = 25 minutes + one compound lift + quick finisher. If life explodes, you still "went."\n' +
      "- Pre-pack gym bag Sunday; sleep in clothes if it helps morning friction.\n" +
      "- Track **weeks with 3 check-ins**, not PRs. One busy week = protect 1–2 micro-sessions instead of zero.\n\n" +
      "Apps fail you because they assume stable days. Design for unstable days.",
  },
  {
    id: "r2",
    speaker: "Challenger",
    cls: "critic",
    label: "Round 2 — challenge",
    text:
      'Morning slots are great until a kid is sick or a deploy fires at 6am. "Before work" isn\'t magically stable.\n\n' +
      "- What happens when **all three** morning slots die the same week? You need a **same-day fallback window** (20m at lunch or brutal 15m bodyweight at home) or you repeat the old collapse.\n" +
      '- "Minimum session" risks junk volume that feels pointless — you may quietly quit. Tie each micro-session to **one tracked set** (weight × reps) so progress still exists.\n' +
      '- Pre-packed bag helps, but the real leak is decision fatigue after work. Where is the **if-then** for the 7pm "I\'m fried" case?\n\n' +
      "Better default: **identity + environment** beats another app — gym near work, shoes by the door, calendar blocks others see.",
  },
  {
    id: "r3",
    speaker: "Planner",
    cls: "strategist",
    label: "Round 3 — defense (1 of 3)",
    text:
      "Fair: mornings aren't sacred. The point is **protected anchor**, not the clock — pick A/B anchors (Mon AM + Wed lunch + Fri AM) so one blown morning doesn't void the week.\n\n" +
      "On micro-sessions: agree they need a **floor standard** — one top-tier compound + one measurable progression target, even if total time is short.\n\n" +
      '7pm fried case: **then-rule** — if I miss the anchor, I do 12 squats + 12 push-ups + 60s plank before scrolling; counts as "touch" to keep the streak psychological without pretending it\'s a full gym day.\n\n' +
      'Environment still wins: schedule gym like a meeting; visible block reduces "maybe later."',
  },
  {
    id: "r4",
    speaker: "Challenger",
    cls: "critic",
    label: "Round 4 — challenge",
    text:
      'The home "touch" is clever for streak psychology, but it can become a **moral license** to skip the gym entirely. Define **max touches per month** before you downgrade the goal.\n\n' +
      "Lunch slots: do you actually have a realistic shower/return window? If not, that's fantasy planning and you'll blame discipline again.\n\n" +
      "You still haven't addressed **sleep debt** — chaotic people often trade sleep for gym time and then both collapse. What's the sleep floor?\n\n" +
      'Stronger alternative: **two hard gym days + one flexible** beats three fragile "perfect" days.',
  },
  {
    id: "r5",
    speaker: "Planner",
    cls: "strategist",
    label: "Round 5 — defense (2 of 3)",
    text:
      "Cap **touches at two per week** unless traveling — third touch must be a real session or honest rest.\n\n" +
      "Lunch: only book it if you've done it twice successfully as a trial; otherwise drop it and use **Sat morning** as the flexible third.\n\n" +
      "Sleep floor: **non-negotiable 6.5h** average weekly; if under, next week's gym plan loses one intensity day (walking counts) until sleep recovers — protect the habit loop.\n\n" +
      '2+1 structure works: Tue/Thu heavy, weekend mobility or long walk as the "flex" third.',
  },
  {
    id: "r6",
    speaker: "Challenger",
    cls: "critic",
    label: "Round 6 — challenge",
    text:
      "Weekend flex sounds nice until social life eats Saturday. You need a **calendar rehearsal**: each Sunday, literally place the three blocks; if Saturday vanishes, **which weekday becomes the substitute**?\n\n" +
      "Intensity days assume your gym isn't slammed at peak hours — queue times kill adherence. Have a **busy-gym alternate** (one machine circuit you can finish in 35m).\n\n" +
      "Credit: sleep floor + touch cap reduces shame-spirals. That's the real win for chaotic schedules.",
  },
  {
    id: "r7",
    speaker: "Planner",
    cls: "strategist",
    label: "Round 7 — defense (3 of 3)",
    text:
      "Sunday **10-minute calendar rehearsal**: lock Tue/Thu + pick Sat *or* Sun backup; if both fail, **Monday evening** is the automatic substitute (already in calendar).\n\n" +
      "Busy-gym fallback: **trap-bar / goblet / pull-up triplet** with timed rests — portable across most gyms.\n\n" +
      "Concede: social volatility is real; that's why the substitute is **named in advance**, not improvised when willpower is zero.\n\n" +
      "Bottom line: protect identity with **planned degradation paths**, not heroics.",
  },
  {
    id: "r8",
    speaker: "Challenger",
    cls: "critic",
    label: "Round 8 — final challenge",
    text:
      "I'll concede the rehearsal + named substitute closes the biggest leak.\n\n" +
      'Last push: **injury / illness** — you need a rule that isn\'t "push through." Two sessions replaced by walks still counts as "week maintained" so you don\'t quit during flu season.\n\n' +
      "Otherwise this is executable. The challenger case was mostly about hidden single points of failure — you've distributed them.",
  },
  {
    id: "r9",
    speaker: "Resolver",
    cls: "synthesis",
    label: "Final resolution",
    text:
      'VERDICT: Treat consistency as a scheduling and degradation problem, not a motivation problem — anchor a few real sessions, cap "touch" cheats, and rehearse substitutes weekly.\n\n' +
      "KEY ACTIONS:\n" +
      "- Book **two non-negotiable gym blocks** weekly (trial mornings vs lunch; keep what actually works).\n" +
      "- Define a **25-minute gym floor** (one heavy compound + one tracked progression) + **max two home touches/week**.\n" +
      "- Every **Sunday**, confirm the three slots + one named backup; add a **busy-gym 35m circuit** fallback.\n" +
      "- Hold a **6.5h sleep floor**; if missed, drop one intensity day next week rather than skipping entirely.\n\n" +
      "WATCH OUT FOR:\n" +
      "- **License effect** from micro-sessions — cap touches and require real sessions most weeks.\n" +
      "- **Fantasy lunch sessions** — if logistics fail twice, delete that slot and pick a weekend anchor instead.",
  },
];

let demoBusy = false;
let demoHistory: Record<string, string> = {};
let demoUsageSteps: SessionUsageStep[] = [];
const demoModels: Record<ModelKey, string> = {
  strategist: "",
  critic: "",
  synthesizer: "",
};

const API_KEY_TOGGLE_SVG = {
  eye: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff:
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>',
};

function syncApiKeyToggleUi(): void {
  const input = document.getElementById("apiKey");
  const btn = document.getElementById("btnApiKeyToggle");
  if (
    !(input instanceof HTMLInputElement) ||
    !(btn instanceof HTMLButtonElement)
  )
    return;
  const masked = input.type === "password";
  btn.innerHTML = masked ? API_KEY_TOGGLE_SVG.eye : API_KEY_TOGGLE_SVG.eyeOff;
  btn.setAttribute("aria-pressed", masked ? "false" : "true");
  btn.setAttribute(
    "aria-label",
    masked ? "Show API key as plain text" : "Mask API key",
  );
  btn.title = masked ? "Show key" : "Mask key";
}

function readDemoModelsFromDom(): void {
  const s = document.getElementById("strategistModel");
  const c = document.getElementById("criticModel");
  const y = document.getElementById("synthesizerModel");
  if (
    !(s instanceof HTMLSelectElement) ||
    !(c instanceof HTMLSelectElement) ||
    !(y instanceof HTMLSelectElement)
  ) {
    throw new Error("Missing model selects.");
  }
  demoModels.strategist = s.value;
  demoModels.critic = c.value;
  demoModels.synthesizer = y.value;
}

function setupDemoForm(): void {
  fillSelectDisabled("strategistModel", "anthropic/claude-sonnet-4.6");
  fillSelectDisabled("criticModel", "google/gemini-2.5-pro");
  fillSelectDisabled("synthesizerModel", "anthropic/claude-sonnet-4.6");
  readDemoModelsFromDom();

  const apiKeyEl = document.getElementById("apiKey");
  if (!(apiKeyEl instanceof HTMLInputElement)) {
    throw new Error("Missing #apiKey");
  }
  apiKeyEl.value = DEMO_API_KEY;
  apiKeyEl.readOnly = true;
  apiKeyEl.type = "text";
  syncApiKeyToggleUi();

  const briefEl = document.getElementById("brief");
  if (!(briefEl instanceof HTMLTextAreaElement)) {
    throw new Error("Missing #brief");
  }
  briefEl.value = DEMO_BRIEF;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function showError(msg: string): void {
  const el = document.getElementById("errorMsg");
  if (!el) return;
  el.textContent = msg;
  el.style.display = "block";
}

function hideError(): void {
  const el = document.getElementById("errorMsg");
  if (!el) return;
  el.style.display = "none";
}

function demoUsageForRound(roundIndex: number): ParsedUsage {
  const bump = roundIndex * 4;
  return {
    prompt: 118 + bump,
    completion: 76 + bump,
    total: 194 + bump * 2,
    cost: 0.00038 + roundIndex * 0.000012,
  };
}

function modelIdForDemoRound(roundId: string): string {
  if (roundId === "r9") return demoModels.synthesizer;
  if (["r2", "r4", "r6", "r8"].includes(roundId)) return demoModels.critic;
  return demoModels.strategist;
}

async function streamCanned(
  contentEl: HTMLElement,
  text: string,
): Promise<string> {
  const stream = createStreamRenderer(contentEl);
  const step = 3;
  for (let i = 0; i < text.length; i += step) {
    stream.push(text.slice(i, i + step));
    await sleep(12);
  }
  return stream.finish();
}

async function startDemo(): Promise<void> {
  if (demoBusy) return;
  demoBusy = true;
  const btnStart = document.getElementById("btnStart");
  if (!(btnStart instanceof HTMLButtonElement)) {
    demoBusy = false;
    throw new Error("Missing #btnStart");
  }
  hideError();
  btnStart.disabled = true;
  const timeline = document.getElementById("timeline");
  if (timeline) timeline.innerHTML = "";
  clearSessionUsageSummary();
  hideSessionDoneChrome();
  readDemoModelsFromDom();
  demoHistory = {};
  demoUsageSteps = [];

  const sessionUsageAgg = createEmptySessionUsageAgg();

  try {
    let idx = 0;
    for (const step of DEMO_ROUNDS) {
      const parts = appendRoundCard({
        id: step.id,
        speaker: step.speaker,
        cls: step.cls,
        label: step.label,
      });
      await sleep(450);
      parts.typingEl.style.display = "none";
      const finished = await streamCanned(parts.contentEl, step.text);
      demoHistory[step.id] = finished;
      const modelId = modelIdForDemoRound(step.id);
      const usage = demoUsageForRound(idx);
      mountRoundUsageFooter(parts.card, modelId, usage);
      addUsageToSessionAgg(sessionUsageAgg, usage);
      demoUsageSteps.push({ id: step.id, model: modelId, usage });
      idx += 1;
      await sleep(200);
    }
    renderSessionUsageSummary(sessionUsageAgg, {
      sessionTitle: "Session",
    });
    showSessionDoneChrome();
    try {
      primeShareUrlCache(
        buildDemoSharePayload(),
        location.origin,
        location.pathname,
      );
    } catch {
      /* copy will encode on demand */
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    showError(message);
    btnStart.disabled = false;
  } finally {
    demoBusy = false;
  }
}

function resetDemo(): void {
  const timeline = document.getElementById("timeline");
  if (timeline) timeline.innerHTML = "";
  clearSessionUsageSummary();
  hideSessionDoneChrome();
  const shareErr = document.getElementById("shareLoadError");
  if (shareErr) {
    shareErr.textContent = "";
    shareErr.setAttribute("hidden", "");
  }
  const shareBanner = document.getElementById("shareViewBanner");
  if (shareBanner) shareBanner.setAttribute("hidden", "");
  const btnStart = document.getElementById("btnStart");
  if (btnStart instanceof HTMLButtonElement) btnStart.disabled = false;
  demoHistory = {};
  demoUsageSteps = [];
  hideError();
  setupDemoForm();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/** Share URLs omit token usage (smaller/faster; only brief, models, and round text). */
function buildDemoSharePayload(): SharePayload {
  const briefEl = document.getElementById("brief");
  if (!(briefEl instanceof HTMLTextAreaElement)) {
    throw new Error("Missing #brief");
  }
  readDemoModelsFromDom();
  return buildSharePayload({
    brief: briefEl.value.trim(),
    planner: demoModels.strategist,
    challenger: demoModels.critic,
    resolver: demoModels.synthesizer,
    rounds: demoHistory,
    source: "demo",
  });
}

async function copyDemoShareLink(): Promise<void> {
  const briefEl = document.getElementById("brief");
  const btnShareLink = document.getElementById("btnShareLink");
  if (!(briefEl instanceof HTMLTextAreaElement)) return;
  if (!(btnShareLink instanceof HTMLButtonElement)) return;
  if (btnShareLink.disabled) return;

  const ui = startShareCopyLoading(btnShareLink);
  try {
    const url = resolveShareUrlForClipboard(
      buildDemoSharePayload(),
      location.origin,
      location.pathname,
    );
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link:", url);
      ui.cancelLoading();
      return;
    }
    try {
      window.history.replaceState(null, "", url);
    } catch {
      showError(
        "Link copied to clipboard, but the address bar could not be updated (URL may be too long for this browser).",
      );
    }
    ui.showCopiedThenReset();
  } catch (err) {
    ui.cancelLoading();
    const message = err instanceof Error ? err.message : String(err);
    showError(message);
  }
}

function wireDemoShareViewer(payload: SharePayload): void {
  wireShareViewer(payload, {
    models: demoModels,
    applyPayloadToSessionState: (rounds) => {
      demoHistory = { ...rounds };
      demoUsageSteps = [];
    },
  });
}

function wireDemo(): void {
  setupDemoForm();
  hideSessionDoneChrome();

  const btnApiKeyToggle = document.getElementById("btnApiKeyToggle");
  const btnStart = document.getElementById("btnStart");
  const btnReset = document.getElementById("btnReset");
  const btnShareLink = document.getElementById("btnShareLink");

  if (!(btnApiKeyToggle instanceof HTMLButtonElement)) {
    throw new Error("Missing #btnApiKeyToggle");
  }
  if (!(btnStart instanceof HTMLButtonElement)) {
    throw new Error("Missing #btnStart");
  }
  if (!(btnReset instanceof HTMLButtonElement)) {
    throw new Error("Missing #btnReset");
  }
  if (!(btnShareLink instanceof HTMLButtonElement)) {
    throw new Error("Missing #btnShareLink");
  }

  btnApiKeyToggle.addEventListener("click", () => {
    const input = document.getElementById("apiKey");
    if (!(input instanceof HTMLInputElement)) return;
    input.type = input.type === "password" ? "text" : "password";
    syncApiKeyToggleUi();
  });

  btnStart.addEventListener("click", () => void startDemo());
  btnReset.addEventListener("click", resetDemo);
  btnShareLink.addEventListener("click", () => void copyDemoShareLink());
}

export function bootstrapDemoApp(): void {
  try {
    const loaded = loadSharePayloadFromLocation();
    if (loaded === "invalid") {
      showShareDecodeError();
    } else if (loaded) {
      wireDemoShareViewer(loaded);
      return;
    }
    wireDemo();
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : String(err);
    showError(message);
  }
}
