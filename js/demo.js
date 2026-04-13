/* global appendRoundCard, createStreamRenderer, document, window */

var DEMO_BRIEF =
  "I want to be more consistent at the gym (3×/week) but I break the streak whenever work gets busy. I've tried apps and strict plans; they don't stick. What strategy actually works for someone who's motivated but chaotic?";

var DEMO_API_KEY = "sk-or-v1-demo";

var MODEL_PRESETS = [
  {
    value: "anthropic/claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
  },
  {
    value: "anthropic/claude-sonnet-4.5",
    label: "Claude Sonnet 4.5",
  },
  {
    value: "anthropic/claude-opus-4.5",
    label: "Claude Opus 4.5",
  },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "openai/gpt-5", label: "GPT-5" },
  {
    value: "deepseek/deepseek-chat",
    label: "DeepSeek V3",
  },
  {
    value: "meta-llama/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B",
  },
];

var DEMO_ROUNDS = [
  {
    id: "r1",
    speaker: "Planner",
    cls: "strategist",
    label: "Round 1 — opening strategy",
    text:
      "Stop optimizing the perfect plan. Your failure mode is all-or-nothing after busy weeks, not lack of motivation.\n\n" +
      "- Pick three **non-negotiable** slots (e.g. Mon/Wed/Fri 7:15am) that are *before* work chaos, not after.\n" +
      "- Rule: **minimum viable session** = 25 minutes + one compound lift + quick finisher. If life explodes, you still \"went.\"\n" +
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
      "Morning slots are great until a kid is sick or a deploy fires at 6am. \"Before work\" isn't magically stable.\n\n" +
      "- What happens when **all three** morning slots die the same week? You need a **same-day fallback window** (20m at lunch or brutal 15m bodyweight at home) or you repeat the old collapse.\n" +
      "- \"Minimum session\" risks junk volume that feels pointless — you may quietly quit. Tie each micro-session to **one tracked set** (weight × reps) so progress still exists.\n" +
      "- Pre-packed bag helps, but the real leak is decision fatigue after work. Where is the **if-then** for the 7pm \"I'm fried\" case?\n\n" +
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
      "7pm fried case: **then-rule** — if I miss the anchor, I do 12 squats + 12 push-ups + 60s plank before scrolling; counts as \"touch\" to keep the streak psychological without pretending it's a full gym day.\n\n" +
      "Environment still wins: schedule gym like a meeting; visible block reduces \"maybe later.\"",
  },
  {
    id: "r4",
    speaker: "Challenger",
    cls: "critic",
    label: "Round 4 — challenge",
    text:
      "The home \"touch\" is clever for streak psychology, but it can become a **moral license** to skip the gym entirely. Define **max touches per month** before you downgrade the goal.\n\n" +
      "Lunch slots: do you actually have a realistic shower/return window? If not, that's fantasy planning and you'll blame discipline again.\n\n" +
      "You still haven't addressed **sleep debt** — chaotic people often trade sleep for gym time and then both collapse. What's the sleep floor?\n\n" +
      "Stronger alternative: **two hard gym days + one flexible** beats three fragile \"perfect\" days.",
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
      "2+1 structure works: Tue/Thu heavy, weekend mobility or long walk as the \"flex\" third.",
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
      "Last push: **injury / illness** — you need a rule that isn't \"push through.\" Two sessions replaced by walks still counts as \"week maintained\" so you don't quit during flu season.\n\n" +
      "Otherwise this is executable. The challenger case was mostly about hidden single points of failure — you've distributed them.",
  },
  {
    id: "r9",
    speaker: "Resolver",
    cls: "synthesis",
    label: "Final resolution",
    text:
      "VERDICT: Treat consistency as a scheduling and degradation problem, not a motivation problem — anchor a few real sessions, cap \"touch\" cheats, and rehearse substitutes weekly.\n\n" +
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

var demoBusy = false;

var API_KEY_TOGGLE_SVG = {
  eye:
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff:
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>',
};

function syncApiKeyToggleUi() {
  var input = /** @type {HTMLInputElement} */ (document.getElementById("apiKey"));
  var btn = document.getElementById("btnApiKeyToggle");
  if (!input || !btn) return;
  var masked = input.type === "password";
  btn.innerHTML = masked ? API_KEY_TOGGLE_SVG.eye : API_KEY_TOGGLE_SVG.eyeOff;
  btn.setAttribute("aria-pressed", masked ? "false" : "true");
  btn.setAttribute(
    "aria-label",
    masked ? "Show API key as plain text" : "Mask API key",
  );
  btn.title = masked ? "Show key" : "Mask key";
}

function fillSelectDisabled(selectId, fallbackValue) {
  var el = /** @type {HTMLSelectElement} */ (document.getElementById(selectId));
  el.replaceChildren();
  for (var i = 0; i < MODEL_PRESETS.length; i++) {
    var o = MODEL_PRESETS[i];
    var opt = document.createElement("option");
    opt.value = o.value;
    opt.textContent = o.label;
    el.appendChild(opt);
  }
  el.value = fallbackValue;
  el.disabled = true;
}

function setupDemoForm() {
  fillSelectDisabled("strategistModel", "anthropic/claude-sonnet-4.6");
  fillSelectDisabled("criticModel", "google/gemini-2.5-pro");
  fillSelectDisabled("synthesizerModel", "anthropic/claude-sonnet-4.6");

  var apiKeyEl = /** @type {HTMLInputElement} */ (document.getElementById("apiKey"));
  apiKeyEl.value = DEMO_API_KEY;
  apiKeyEl.readOnly = true;
  apiKeyEl.type = "text";
  syncApiKeyToggleUi();

  var briefEl = /** @type {HTMLTextAreaElement} */ (document.getElementById("brief"));
  briefEl.value = DEMO_BRIEF;
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function showError(msg) {
  var el = document.getElementById("errorMsg");
  el.textContent = msg;
  el.style.display = "block";
}

function hideError() {
  document.getElementById("errorMsg").style.display = "none";
}

function clearDemoUsage() {
  var el = document.getElementById("sessionUsage");
  el.replaceChildren();
  el.hidden = true;
}

function showDemoUsageNote() {
  var el = document.getElementById("sessionUsage");
  el.hidden = false;
  el.replaceChildren();
  var p = document.createElement("p");
  p.style.margin = "0";
  p.textContent = "Demo — no OpenRouter usage or cost.";
  el.appendChild(p);
}

async function streamCanned(contentEl, text) {
  var stream = createStreamRenderer(contentEl);
  var step = 3;
  for (var i = 0; i < text.length; i += step) {
    stream.push(text.slice(i, i + step));
    await sleep(12);
  }
  return stream.finish();
}

async function startDemo() {
  if (demoBusy) return;
  demoBusy = true;
  var btnStart = document.getElementById("btnStart");
  hideError();
  btnStart.disabled = true;
  document.getElementById("timeline").innerHTML = "";
  clearDemoUsage();
  document.getElementById("btnReset").style.display = "none";

  try {
    for (var r = 0; r < DEMO_ROUNDS.length; r++) {
      var step = DEMO_ROUNDS[r];
      var parts = appendRoundCard({
        id: step.id,
        speaker: step.speaker,
        cls: step.cls,
        label: step.label,
      });
      await sleep(450);
      parts.typingEl.style.display = "none";
      await streamCanned(parts.contentEl, step.text);
      await sleep(200);
    }
    showDemoUsageNote();
    document.getElementById("btnReset").style.display = "block";
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    showError(message);
    btnStart.disabled = false;
  } finally {
    demoBusy = false;
  }
}

function resetDemo() {
  document.getElementById("timeline").innerHTML = "";
  clearDemoUsage();
  document.getElementById("btnReset").style.display = "none";
  document.getElementById("btnStart").disabled = false;
  hideError();
  setupDemoForm();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

setupDemoForm();

document.getElementById("btnApiKeyToggle").addEventListener("click", function () {
  var input = /** @type {HTMLInputElement} */ (document.getElementById("apiKey"));
  input.type = input.type === "password" ? "text" : "password";
  syncApiKeyToggleUi();
});

document.getElementById("btnStart").addEventListener("click", function () {
  startDemo();
});
document.getElementById("btnReset").addEventListener("click", resetDemo);
