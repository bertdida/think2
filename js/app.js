const OPENROUTER_ORIGIN = "https://openrouter.ai";
const STORAGE_STRATEGIST = "think2.strategistModel";
const STORAGE_CRITIC = "think2.criticModel";
const STORAGE_SYNTHESIZER = "think2.synthesizerModel";
const SESSION_MODEL_IDS = "think2.openrouterModelIds.v1";

const SAMPLE_BRIEFS = [
  "I want to be more consistent at the gym (3×/week) but I break the streak whenever work gets busy. I've tried apps and strict plans; they don't stick. What strategy actually works for someone who's motivated but chaotic?",
  "I have a side project that's been 'almost ready' for months: it works for me, but I have no users. I work full-time and can spend maybe 6 hours a week on it. I keep tweaking code instead of talking to people. What should my next 30 days look like if I want real feedback, not more polishing?",
  "I'm a mid-level developer and my job is fine, but I feel stuck on growth. Updating my resume feels overwhelming and I avoid networking. I can interview when I get a chance, but I don't know how to pick the next role without jumping randomly. How should I spend the next 6 weeks?",
  "I'm saving for a used car in about a year, but I also want a modest vacation this summer. I have a small amount of debt I'm paying down. Income is steady but tight. How do I balance vacation, the car fund, and debt without feeling like I'm failing at all three?",
  "I paid for an online course six months ago and I've barely started. Evenings I'm tired and default to scrolling. I still want to finish it without burning out at my day job. What's a realistic weekly structure for the next month?",
  "I'm building a small tool for a niche audience. Friends say 'add this feature' and the scope keeps growing. I'm afraid if I cut features nobody will care, but if I keep expanding I'll never ship. How do I decide what belongs in v1?",
  "A coworker often interrupts me in meetings and takes credit for ideas I shared privately. I don't want to be labeled difficult, but it's affecting my morale. What is a practical way to handle the next few weeks?",
  "I work from home with kids in the house after school. I need focused blocks for deep work but I feel guilty saying no to family. What boundaries or routines actually work for people in a similar setup?",
  "I was promoted to lead a tiny team and I second-guess every decision. I want to support people without micromanaging, but I'm anxious about being judged if projects slip. What should I focus on in my first 90 days?",
  "I run a tiny newsletter with slow growth. I enjoy writing but promotion feels cringe. I post inconsistently on social. What is a simple growth strategy that doesn't make me hate my weekends?",
];

const MODEL_ID_RE = /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/i;

const MODEL_PRESETS = [
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

/** @type {readonly [string, string][]} */
const DEBATE_TRANSCRIPT_ROUNDS = [
  ["r1", "PLANNER (Round 1)"],
  ["r2", "CHALLENGER (Round 2)"],
  ["r3", "PLANNER (Round 3)"],
  ["r4", "CHALLENGER (Round 4)"],
  ["r5", "PLANNER (Round 5)"],
  ["r6", "CHALLENGER (Round 6)"],
  ["r7", "PLANNER (Round 7)"],
  ["r8", "CHALLENGER (Round 8)"],
];

/**
 * @param {string} brief
 * @param {Record<string, string>} history
 * @param {string} lastRoundId — include transcript through this round (inclusive)
 */
function debateTranscriptThrough(brief, history, lastRoundId) {
  const chunks = [`BRIEF:\n${brief}\n`];
  for (const [id, label] of DEBATE_TRANSCRIPT_ROUNDS) {
    const text = history[id];
    if (typeof text === "string" && text.length > 0) {
      chunks.push(`${label}:\n${text}\n`);
    }
    if (id === lastRoundId) break;
  }
  return chunks.join("\n");
}

const STRATEGIST_SYSTEM_OPENING = `You are a sharp, opinionated strategic advisor. When given a brief, propose a concrete, actionable strategy. Be direct. No fluff. Use bullet points where useful. Max 200 words.`;
const STRATEGIST_SYSTEM_DEFENSE = `You are a sharp, opinionated strategic advisor defending your position under pressure. Be direct. Concede where the challenger has a point, but hold firm where you're confident. Max 200 words.`;
const CRITIC_SYSTEM = `You are a ruthless but fair devil's advocate. Find the weakest points, challenge them with better alternatives or hard questions, and acknowledge what improved when it did. Do not agree just to be polite. Be specific. Max 200 words.`;

const ROUNDS = [
  {
    id: "r1",
    speaker: "Planner",
    cls: "strategist",
    label: "Round 1 — opening strategy",
    modelKey: "strategist",
    buildMessages: (brief, history) => [
      {
        role: "user",
        content: `Here is the situation:\n\n${brief}\n\nPropose your strategy. Be direct, specific, and actionable. Max 200 words.`,
      },
    ],
    system: STRATEGIST_SYSTEM_OPENING,
  },
  {
    id: "r2",
    speaker: "Challenger",
    cls: "critic",
    label: "Round 2 — challenge",
    modelKey: "critic",
    buildMessages: (brief, history) => [
      {
        role: "user",
        content: `${debateTranscriptThrough(brief, history, "r1")}\nChallenge this strategy. Find the weakest points. Propose better alternatives where you disagree. Be specific. Max 200 words.`,
      },
    ],
    system: CRITIC_SYSTEM,
  },
  {
    id: "r3",
    speaker: "Planner",
    cls: "strategist",
    label: "Round 3 — defense (1 of 3)",
    modelKey: "strategist",
    buildMessages: (brief, history) => [
      {
        role: "user",
        content: `${debateTranscriptThrough(brief, history, "r2")}\nDefend or refine your position (first of three defense passes). Concede where the challenger is right. Hold firm where you're not. Max 200 words.`,
      },
    ],
    system: STRATEGIST_SYSTEM_DEFENSE,
  },
  {
    id: "r4",
    speaker: "Challenger",
    cls: "critic",
    label: "Round 4 — challenge",
    modelKey: "critic",
    buildMessages: (brief, history) => [
      {
        role: "user",
        content: `${debateTranscriptThrough(brief, history, "r3")}\nPush back on what still fails; acknowledge what improved. Max 200 words.`,
      },
    ],
    system: CRITIC_SYSTEM,
  },
  {
    id: "r5",
    speaker: "Planner",
    cls: "strategist",
    label: "Round 5 — defense (2 of 3)",
    modelKey: "strategist",
    buildMessages: (brief, history) => [
      {
        role: "user",
        content: `${debateTranscriptThrough(brief, history, "r4")}\nDefend or refine again (second of three defense passes). Max 200 words.`,
      },
    ],
    system: STRATEGIST_SYSTEM_DEFENSE,
  },
  {
    id: "r6",
    speaker: "Challenger",
    cls: "critic",
    label: "Round 6 — challenge",
    modelKey: "critic",
    buildMessages: (brief, history) => [
      {
        role: "user",
        content: `${debateTranscriptThrough(brief, history, "r5")}\nChallenge what still does not hold; credit stronger replies. Max 200 words.`,
      },
    ],
    system: CRITIC_SYSTEM,
  },
  {
    id: "r7",
    speaker: "Planner",
    cls: "strategist",
    label: "Round 7 — defense (3 of 3)",
    modelKey: "strategist",
    buildMessages: (brief, history) => [
      {
        role: "user",
        content: `${debateTranscriptThrough(brief, history, "r6")}\nDefend or refine (third and final defense pass). Be explicit about what you concede vs. what you stand on. Max 200 words.`,
      },
    ],
    system: STRATEGIST_SYSTEM_DEFENSE,
  },
  {
    id: "r8",
    speaker: "Challenger",
    cls: "critic",
    label: "Round 8 — final challenge",
    modelKey: "critic",
    buildMessages: (brief, history) => [
      {
        role: "user",
        content: `${debateTranscriptThrough(brief, history, "r7")}\nLast word before resolution: concede where they convinced you; push back where they did not. Max 200 words.`,
      },
    ],
    system: CRITIC_SYSTEM,
  },
  {
    id: "r9",
    speaker: "Resolver",
    cls: "synthesis",
    label: "Final resolution",
    modelKey: "synthesizer",
    buildMessages: (brief, history) => [
      {
        role: "user",
        content: `You observed a structured exchange: a planner defended their position in three passes against a challenger. Resolve the strongest threads into one final recommendation.\n\n${debateTranscriptThrough(brief, history, "r8")}\nFormat your response exactly as:\n\nVERDICT: (1 decisive sentence)\n\nKEY ACTIONS:\n- (action 1)\n- (action 2)\n- (action 3)\n- (action 4)\n\nWATCH OUT FOR:\n- (risk 1)\n- (risk 2)`,
      },
    ],
    system: `You are a neutral senior advisor resolving a planner–challenger exchange into a final recommendation. Be decisive. No hedging. Follow the exact format requested.`,
  },
];

/** @type {Record<string, string>} */
let history = {};
/** @type {{ strategist: string; critic: string; synthesizer: string }} */
let models = {
  strategist: "",
  critic: "",
  synthesizer: "",
};

function openRouterHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://think2.xyz",
    "X-OpenRouter-Title": "think2",
  };
}

function parseHttpErrorBody(text, status) {
  try {
    const j = JSON.parse(text);
    const msg = j.error?.message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  } catch {
    /* ignore */
  }
  const t = text.trim();
  if (t.length > 0 && t.length < 400) return t;
  return `HTTP ${status}`;
}

function showError(msg) {
  const el = document.getElementById("errorMsg");
  el.textContent = msg;
  el.style.display = "block";
}

function hideError() {
  document.getElementById("errorMsg").style.display = "none";
}

function presetValues() {
  return new Set(MODEL_PRESETS.map((p) => p.value));
}

function fillSelect(selectId, storageKey, fallbackValue) {
  const el = /** @type {HTMLSelectElement} */ (
    document.getElementById(selectId)
  );
  el.replaceChildren();
  for (const o of MODEL_PRESETS) {
    const opt = document.createElement("option");
    opt.value = o.value;
    opt.textContent = o.label;
    el.appendChild(opt);
  }
  const allowed = presetValues();
  const saved = localStorage.getItem(storageKey);
  if (saved && allowed.has(saved)) el.value = saved;
  else el.value = fallbackValue;
  el.addEventListener("change", () => {
    localStorage.setItem(storageKey, el.value);
  });
}

/**
 * @param {string} apiKey
 * @returns {Promise<Set<string>>}
 */
async function fetchOpenRouterModelIds(apiKey) {
  const cached = sessionStorage.getItem(SESSION_MODEL_IDS);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string"))
      return new Set(parsed);
  }

  const res = await fetch(`${OPENROUTER_ORIGIN}/api/v1/models`, {
    method: "GET",
    mode: "cors",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(parseHttpErrorBody(text, res.status));
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON from OpenRouter models list.");
  }
  const rows = data.data;
  if (!Array.isArray(rows)) {
    throw new Error("Unexpected models response shape.");
  }
  const ids = rows
    .map((m) => m && typeof m.id === "string" && m.id)
    .filter(Boolean);
  if (ids.length === 0) {
    throw new Error("No models returned from OpenRouter.");
  }
  sessionStorage.setItem(SESSION_MODEL_IDS, JSON.stringify(ids));
  return new Set(ids);
}

/**
 * @param {Set<string>} idSet
 * @param {string[]} ids
 */
function assertModelsKnown(idSet, ids) {
  const missing = ids.filter((id) => !idSet.has(id));
  if (missing.length > 0) {
    throw new Error(
      `Unknown or unavailable model for your key: ${missing.join(", ")}`,
    );
  }
}

/**
 * @param {string[]} ids
 */
function assertModelIdFormat(ids) {
  for (const id of ids) {
    if (!MODEL_ID_RE.test(id)) {
      throw new Error(
        `Invalid model id format (expected provider/model): ${id}`,
      );
    }
  }
}

function pickNextBrief() {
  if (SAMPLE_BRIEFS.length === 0) return "";
  const ta = document.getElementById("brief");
  const current = ta ? ta.value : "";
  const idx = SAMPLE_BRIEFS.indexOf(current);
  const nextIdx = idx === -1 ? 0 : (idx + 1) % SAMPLE_BRIEFS.length;
  return SAMPLE_BRIEFS[nextIdx];
}

const usageMoneyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
  maximumFractionDigits: 6,
});

/**
 * @param {unknown} usage
 * @returns {{ prompt: number | null; completion: number | null; total: number | null; cost: number | null }}
 */
function parseOpenRouterUsage(usage) {
  const empty = {
    prompt: null,
    completion: null,
    total: null,
    cost: null,
  };
  if (!usage || typeof usage !== "object") return empty;
  const o = /** @type {Record<string, unknown>} */ (usage);
  const readNum = (k) => {
    const v = o[k];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };
  return {
    prompt: readNum("prompt_tokens"),
    completion: readNum("completion_tokens"),
    total: readNum("total_tokens"),
    cost: readNum("cost"),
  };
}

function usageHasAnyTokenOrCost(u) {
  return (
    u.prompt != null ||
    u.completion != null ||
    u.total != null ||
    u.cost != null
  );
}

/**
 * @param {{ prompt: number | null; completion: number | null; total: number | null; cost: number | null }} u
 * @returns {number | null}
 */
function sessionTokenContribution(u) {
  if (u.total != null) return u.total;
  if (u.prompt != null && u.completion != null) return u.prompt + u.completion;
  return null;
}

/**
 * @param {HTMLElement} cardEl
 * @param {string} modelId
 * @param {{ prompt: number | null; completion: number | null; total: number | null; cost: number | null }} u
 */
function mountRoundUsageFooter(cardEl, modelId, u) {
  const inner = cardEl.querySelector(".card-inner");
  if (!inner) return;

  const wrap = document.createElement("div");
  wrap.className = "round-usage";
  wrap.setAttribute("role", "status");

  const modelLine = document.createElement("span");
  modelLine.className = "usage-model";
  modelLine.textContent = modelId;

  const detail = document.createElement("span");

  if (!usageHasAnyTokenOrCost(u)) {
    detail.textContent = "Usage unavailable from API for this step.";
  } else {
    const parts = [];
    if (u.prompt != null) parts.push(`in ${u.prompt.toLocaleString()}`);
    if (u.completion != null)
      parts.push(`out ${u.completion.toLocaleString()}`);
    if (u.total != null) parts.push(`total ${u.total.toLocaleString()}`);
    let line = parts.join(" · ");
    if (u.cost != null) {
      line += ` · ${usageMoneyFmt.format(u.cost)}`;
    }
    detail.textContent = line;
  }

  wrap.appendChild(modelLine);
  wrap.appendChild(detail);
  inner.appendChild(wrap);
}

/**
 * @returns {{ tokensSum: number; tokenRounds: number; costSum: number; costRounds: number }}
 */
function createEmptySessionUsageAgg() {
  return {
    tokensSum: 0,
    tokenRounds: 0,
    costSum: 0,
    costRounds: 0,
  };
}

/**
 * @param {{ tokensSum: number; tokenRounds: number; costSum: number; costRounds: number }} agg
 * @param {{ prompt: number | null; completion: number | null; total: number | null; cost: number | null }} u
 */
function addUsageToSessionAgg(agg, u) {
  const tok = sessionTokenContribution(u);
  if (tok != null) {
    agg.tokensSum += tok;
    agg.tokenRounds += 1;
  }
  if (u.cost != null) {
    agg.costSum += u.cost;
    agg.costRounds += 1;
  }
}

/**
 * @param {{ tokensSum: number; tokenRounds: number; costSum: number; costRounds: number }} agg
 */
function renderSessionUsageSummary(agg) {
  const el = document.getElementById("sessionUsage");
  if (!el) return;
  if (agg.tokenRounds === 0 && agg.costRounds === 0) {
    el.replaceChildren();
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.replaceChildren();
  const strong = document.createElement("strong");
  strong.textContent = "Session (OpenRouter)";
  el.appendChild(strong);
  const desc = document.createElement("p");
  desc.style.margin = "6px 0 0";
  const bits = [];
  if (agg.tokenRounds > 0) {
    bits.push(
      `Σ tokens (per-step total, summed): ${agg.tokensSum.toLocaleString()} (${agg.tokenRounds} steps)`,
    );
  }
  if (agg.costRounds > 0) {
    bits.push(
      `Σ cost: ${usageMoneyFmt.format(agg.costSum)} (${agg.costRounds} steps)`,
    );
  }
  desc.textContent = bits.join(" — ");
  el.appendChild(desc);
}

function clearSessionUsageSummary() {
  const el = document.getElementById("sessionUsage");
  if (!el) return;
  el.replaceChildren();
  el.hidden = true;
}

/**
 * @param {typeof ROUNDS[number]} round
 * @param {string} brief
 * @param {string} apiKey
 * @param {{ tokensSum: number; tokenRounds: number; costSum: number; costRounds: number }} sessionAgg
 * @returns {Promise<boolean>}
 */
async function runRound(round, brief, apiKey, sessionAgg) {
  const { card, contentEl, typingEl } = appendRoundCard({
    id: round.id,
    speaker: round.speaker,
    cls: round.cls,
    label: round.label,
  });
  const model = models[round.modelKey];
  /** @type {ReturnType<typeof createStreamRenderer> | null} */
  let streamRef = null;

  try {
    const response = await fetch(
      `${OPENROUTER_ORIGIN}/api/v1/chat/completions`,
      {
        method: "POST",
        mode: "cors",
        headers: openRouterHeaders(apiKey),
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: round.system },
            ...round.buildMessages(brief, history),
          ],
          stream: true,
          max_tokens: 2000,
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(parseHttpErrorBody(errText, response.status));
    }

    typingEl.style.display = "none";
    streamRef = createStreamRenderer(contentEl);

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body to read.");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    /** @type {unknown} */
    let lastUsageRaw = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === "" || trimmed.startsWith(":")) continue;
        if (!trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") break;
        let json;
        try {
          json = JSON.parse(data);
        } catch {
          continue;
        }
        if (json.usage && typeof json.usage === "object") {
          lastUsageRaw = json.usage;
        }
        const chunk = json.choices?.[0]?.delta?.content;
        if (typeof chunk === "string" && chunk.length > 0) {
          streamRef.push(chunk);
        }
      }
    }

    const fullText = streamRef.finish();
    streamRef = null;
    history[round.id] = fullText;
    const usageSnap = parseOpenRouterUsage(lastUsageRaw);
    mountRoundUsageFooter(card, model, usageSnap);
    addUsageToSessionAgg(sessionAgg, usageSnap);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    typingEl.style.display = "none";
    if (streamRef) {
      streamRef.cancel();
      streamRef = null;
    }
    contentEl.innerHTML = `<span class="stream-error">Error: ${escapeHtml(message)}</span>`;
    history[round.id] = "[error]";
    showError(`This step failed: ${message}`);
    return false;
  }
}

async function startDebate() {
  const apiKey = document.getElementById("apiKey").value.trim();
  const brief = document.getElementById("brief").value.trim();
  const btnStart = document.getElementById("btnStart");

  if (!apiKey) return showError("Paste your OpenRouter API key first.");
  if (!brief) return showError("Describe your situation first.");

  models.strategist = document.getElementById("strategistModel").value;
  models.critic = document.getElementById("criticModel").value;
  models.synthesizer = document.getElementById("synthesizerModel").value;

  const chosen = [
    models.strategist,
    models.critic,
    models.synthesizer,
  ];
  try {
    assertModelIdFormat(chosen);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return showError(msg);
  }

  hideError();
  btnStart.disabled = true;
  document.getElementById("timeline").innerHTML = "";
  clearSessionUsageSummary();
  history = {};
  const sessionUsageAgg = createEmptySessionUsageAgg();

  let completed = false;
  try {
    const idSet = await fetchOpenRouterModelIds(apiKey);
    assertModelsKnown(idSet, chosen);

    for (const round of ROUNDS) {
      const ok = await runRound(round, brief, apiKey, sessionUsageAgg);
      if (!ok) return;
    }
    renderSessionUsageSummary(sessionUsageAgg);
    completed = true;
    document.getElementById("btnReset").style.display = "block";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    showError(message);
  } finally {
    if (!completed) btnStart.disabled = false;
  }
}

function resetSession() {
  document.getElementById("timeline").innerHTML = "";
  clearSessionUsageSummary();
  document.getElementById("btnReset").style.display = "none";
  document.getElementById("btnStart").disabled = false;
  document.getElementById("brief").value = "";
  const apiKeyEl = document.getElementById("apiKey");
  apiKeyEl.type = "password";
  syncApiKeyToggleUi();
  history = {};
  hideError();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("btnStart").addEventListener("click", startDebate);
document.getElementById("btnReset").addEventListener("click", resetSession);

document.getElementById("btnBriefClear").addEventListener("click", () => {
  document.getElementById("brief").value = "";
});
document.getElementById("btnBriefNext").addEventListener("click", () => {
  const briefEl = document.getElementById("brief");
  briefEl.value = pickNextBrief();
  briefEl.focus();
  briefEl.setSelectionRange(briefEl.value.length, briefEl.value.length);
});

const API_KEY_TOGGLE_SVG = {
  eye: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`,
};

function syncApiKeyToggleUi() {
  const input = document.getElementById("apiKey");
  const btn = document.getElementById("btnApiKeyToggle");
  const masked = input.type === "password";
  btn.innerHTML = masked ? API_KEY_TOGGLE_SVG.eye : API_KEY_TOGGLE_SVG.eyeOff;
  btn.setAttribute("aria-pressed", masked ? "false" : "true");
  btn.setAttribute(
    "aria-label",
    masked ? "Show API key as plain text" : "Mask API key",
  );
  btn.title = masked ? "Show key" : "Mask key";
}

document.getElementById("btnApiKeyToggle").addEventListener("click", () => {
  const input = document.getElementById("apiKey");
  input.type = input.type === "password" ? "text" : "password";
  syncApiKeyToggleUi();
});

syncApiKeyToggleUi();

fillSelect("strategistModel", STORAGE_STRATEGIST, "anthropic/claude-sonnet-4.6");
fillSelect("criticModel", STORAGE_CRITIC, "google/gemini-2.5-pro");
fillSelect(
  "synthesizerModel",
  STORAGE_SYNTHESIZER,
  "anthropic/claude-sonnet-4.6",
);
