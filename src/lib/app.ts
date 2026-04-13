import { appendRoundCard, createStreamRenderer, escapeHtml } from "./shared.js";
import { parseOpenRouterUsage } from "./openrouter-usage.js";
import type { ModelKey } from "./debate-rounds.js";
import type { RoundDef } from "./debate-rounds.js";
import { ROUNDS } from "./debate-rounds.js";
import { setupModelSelects } from "./model-selects.js";
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
  type SessionUsageAgg,
  type SessionUsageStep,
} from "./usage-display.js";

const OPENROUTER_ORIGIN = "https://openrouter.ai";
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

let history: Record<string, string> = {};
let sessionUsageSteps: SessionUsageStep[] = [];
const models: Record<ModelKey, string> = {
  strategist: "",
  critic: "",
  synthesizer: "",
};

function openRouterHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://think2.xyz",
    "X-OpenRouter-Title": "think2",
  };
}

function parseHttpErrorBody(text: string, status: number): string {
  try {
    const j: unknown = JSON.parse(text);
    if (j && typeof j === "object" && "error" in j) {
      const err = (j as { error?: { message?: unknown } }).error;
      const msg = err?.message;
      if (typeof msg === "string" && msg.length > 0) return msg;
    }
  } catch {
    /* ignore */
  }
  const t = text.trim();
  if (t.length > 0 && t.length < 400) return t;
  return `HTTP ${status}`;
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

interface OpenRouterModelRow {
  id?: string;
}

interface OpenRouterModelsJson {
  data?: OpenRouterModelRow[];
}

async function fetchOpenRouterModelIds(apiKey: string): Promise<Set<string>> {
  const cached = sessionStorage.getItem(SESSION_MODEL_IDS);
  if (cached) {
    const parsed: unknown = JSON.parse(cached);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string"))
      return new Set(parsed as string[]);
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
  let data: OpenRouterModelsJson;
  try {
    data = JSON.parse(text) as OpenRouterModelsJson;
  } catch {
    throw new Error("Invalid JSON from OpenRouter models list.");
  }
  const rows = data.data;
  if (!Array.isArray(rows)) {
    throw new Error("Unexpected models response shape.");
  }
  const ids = rows
    .map((m) => (m && typeof m.id === "string" ? m.id : ""))
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) {
    throw new Error("No models returned from OpenRouter.");
  }
  sessionStorage.setItem(SESSION_MODEL_IDS, JSON.stringify(ids));
  return new Set(ids);
}

function assertModelsKnown(idSet: Set<string>, ids: string[]): void {
  const missing = ids.filter((id) => !idSet.has(id));
  if (missing.length > 0) {
    throw new Error(
      `Unknown or unavailable model for your key: ${missing.join(", ")}`,
    );
  }
}

function assertModelIdFormat(ids: string[]): void {
  for (const id of ids) {
    if (!MODEL_ID_RE.test(id)) {
      throw new Error(
        `Invalid model id format (expected provider/model): ${id}`,
      );
    }
  }
}

function pickNextBrief(): string {
  if (SAMPLE_BRIEFS.length === 0) return "";
  const ta = document.getElementById("brief");
  const current = ta instanceof HTMLTextAreaElement ? ta.value : "";
  const idx = SAMPLE_BRIEFS.indexOf(current);
  const nextIdx = idx === -1 ? 0 : (idx + 1) % SAMPLE_BRIEFS.length;
  return SAMPLE_BRIEFS[nextIdx] ?? "";
}

interface SseChoiceDelta {
  choices?: Array<{ delta?: { content?: unknown } }>;
}

interface SseChunkJson extends SseChoiceDelta {
  usage?: unknown;
}

async function runRound(
  round: RoundDef,
  brief: string,
  apiKey: string,
  sessionAgg: SessionUsageAgg,
): Promise<boolean> {
  const { card, contentEl, typingEl } = appendRoundCard({
    id: round.id,
    speaker: round.speaker,
    cls: round.cls,
    label: round.label,
  });
  const model = models[round.modelKey];
  let streamRef: ReturnType<typeof createStreamRenderer> | null = null;

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
    let lastUsageRaw: unknown = null;

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
        let json: SseChunkJson;
        try {
          json = JSON.parse(data) as SseChunkJson;
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
    sessionUsageSteps.push({
      id: round.id,
      model,
      usage: usageSnap,
    });
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

async function startDebate(): Promise<void> {
  const apiKeyEl = document.getElementById("apiKey");
  const briefEl = document.getElementById("brief");
  const btnStart = document.getElementById("btnStart");
  if (
    !(apiKeyEl instanceof HTMLInputElement) ||
    !(briefEl instanceof HTMLTextAreaElement) ||
    !(btnStart instanceof HTMLButtonElement)
  ) {
    throw new Error("Missing required session controls in DOM.");
  }

  const apiKey = apiKeyEl.value.trim();
  const brief = briefEl.value.trim();

  if (!apiKey) return void showError("Paste your OpenRouter API key first.");
  if (!brief) return void showError("Describe your situation first.");

  const strategistEl = document.getElementById("strategistModel");
  const criticEl = document.getElementById("criticModel");
  const synthesizerEl = document.getElementById("synthesizerModel");
  if (
    !(strategistEl instanceof HTMLSelectElement) ||
    !(criticEl instanceof HTMLSelectElement) ||
    !(synthesizerEl instanceof HTMLSelectElement)
  ) {
    throw new Error("Missing model select elements.");
  }

  models.strategist = strategistEl.value;
  models.critic = criticEl.value;
  models.synthesizer = synthesizerEl.value;

  const chosen = [models.strategist, models.critic, models.synthesizer];
  try {
    assertModelIdFormat(chosen);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return void showError(msg);
  }

  hideError();
  btnStart.disabled = true;
  const timeline = document.getElementById("timeline");
  if (timeline) timeline.innerHTML = "";
  clearSessionUsageSummary();
  hideSessionDoneChrome();
  history = {};
  sessionUsageSteps = [];
  const sessionUsageAgg = createEmptySessionUsageAgg();

  let completed = false;
  try {
    const idSet = await fetchOpenRouterModelIds(apiKey);
    assertModelsKnown(idSet, chosen);

    for (const round of ROUNDS) {
      const ok = await runRound(round, brief, apiKey, sessionUsageAgg);
      if (!ok) return;
    }
    renderSessionUsageSummary(sessionUsageAgg, {
      sessionTitle: "Session",
    });
    completed = true;
    showSessionDoneChrome();
    try {
      primeShareUrlCache(
        buildLiveSharePayload(),
        location.origin,
        location.pathname,
      );
    } catch {
      /* copy will encode on demand */
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    showError(message);
  } finally {
    if (!completed) btnStart.disabled = false;
  }
}

function resetSession(): void {
  const timeline = document.getElementById("timeline");
  if (timeline) timeline.innerHTML = "";
  clearSessionUsageSummary();
  hideSessionDoneChrome();
  const btnStart = document.getElementById("btnStart");
  const brief = document.getElementById("brief");
  const apiKeyEl = document.getElementById("apiKey");
  if (btnStart instanceof HTMLButtonElement) btnStart.disabled = false;
  if (brief instanceof HTMLTextAreaElement) {
    brief.value = "";
    brief.readOnly = false;
  }
  for (const selId of ["strategistModel", "criticModel", "synthesizerModel"]) {
    const el = document.getElementById(selId);
    if (el instanceof HTMLSelectElement) el.disabled = false;
  }
  if (apiKeyEl instanceof HTMLInputElement) {
    apiKeyEl.type = "password";
    apiKeyEl.disabled = false;
    syncApiKeyToggleUi();
  }
  const apiWrap = document.getElementById("apiKeyFieldWrap");
  if (apiWrap instanceof HTMLElement) apiWrap.hidden = false;
  const btnBriefClear = document.getElementById("btnBriefClear");
  const btnBriefNext = document.getElementById("btnBriefNext");
  const btnApiKeyToggle = document.getElementById("btnApiKeyToggle");
  if (btnBriefClear instanceof HTMLButtonElement) btnBriefClear.disabled = false;
  if (btnBriefNext instanceof HTMLButtonElement) btnBriefNext.disabled = false;
  if (btnApiKeyToggle instanceof HTMLButtonElement)
    btnApiKeyToggle.disabled = false;
  history = {};
  sessionUsageSteps = [];
  hideError();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

const API_KEY_TOGGLE_SVG = {
  eye: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`,
};

/** Share URLs omit token usage (smaller/faster; only brief, models, and round text). */
function buildLiveSharePayload(): SharePayload {
  const briefEl = document.getElementById("brief");
  if (!(briefEl instanceof HTMLTextAreaElement)) {
    throw new Error("Missing #brief");
  }
  const ids = readLiveModelIdsFromDom();
  return buildSharePayload({
    brief: briefEl.value.trim(),
    planner: ids.strategist,
    challenger: ids.critic,
    resolver: ids.synthesizer,
    rounds: history,
  });
}

function readLiveModelIdsFromDom(): {
  strategist: string;
  critic: string;
  synthesizer: string;
} {
  const strategistEl = document.getElementById("strategistModel");
  const criticEl = document.getElementById("criticModel");
  const synthesizerEl = document.getElementById("synthesizerModel");
  if (
    !(strategistEl instanceof HTMLSelectElement) ||
    !(criticEl instanceof HTMLSelectElement) ||
    !(synthesizerEl instanceof HTMLSelectElement)
  ) {
    throw new Error("Missing model select elements.");
  }
  return {
    strategist: strategistEl.value,
    critic: criticEl.value,
    synthesizer: synthesizerEl.value,
  };
}

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

async function copyShareLinkFromSession(): Promise<void> {
  const briefEl = document.getElementById("brief");
  const btnShareLink = document.getElementById("btnShareLink");
  if (!(briefEl instanceof HTMLTextAreaElement)) return;
  if (!(btnShareLink instanceof HTMLButtonElement)) return;
  if (btnShareLink.disabled) return;

  const ui = startShareCopyLoading(btnShareLink);
  try {
    const url = resolveShareUrlForClipboard(
      buildLiveSharePayload(),
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

function wireLiveShareViewer(payload: SharePayload): void {
  wireShareViewer(payload, {
    models,
    applyPayloadToSessionState: (rounds) => {
      history = { ...rounds };
      sessionUsageSteps = [];
    },
  });
}

function wireApp(): void {
  const btnStart = document.getElementById("btnStart");
  const btnReset = document.getElementById("btnReset");
  const btnShareLink = document.getElementById("btnShareLink");
  const btnBriefClear = document.getElementById("btnBriefClear");
  const btnBriefNext = document.getElementById("btnBriefNext");
  const btnApiKeyToggle = document.getElementById("btnApiKeyToggle");

  if (!(btnStart instanceof HTMLButtonElement)) {
    throw new Error("Missing #btnStart");
  }
  if (!(btnReset instanceof HTMLButtonElement)) {
    throw new Error("Missing #btnReset");
  }
  if (!(btnShareLink instanceof HTMLButtonElement)) {
    throw new Error("Missing #btnShareLink");
  }
  if (!(btnBriefClear instanceof HTMLButtonElement)) {
    throw new Error("Missing #btnBriefClear");
  }
  if (!(btnBriefNext instanceof HTMLButtonElement)) {
    throw new Error("Missing #btnBriefNext");
  }
  if (!(btnApiKeyToggle instanceof HTMLButtonElement)) {
    throw new Error("Missing #btnApiKeyToggle");
  }

  hideSessionDoneChrome();

  btnStart.addEventListener("click", () => void startDebate());
  btnReset.addEventListener("click", resetSession);
  btnShareLink.addEventListener("click", () => void copyShareLinkFromSession());

  btnBriefClear.addEventListener("click", () => {
    const briefEl = document.getElementById("brief");
    if (briefEl instanceof HTMLTextAreaElement) briefEl.value = "";
  });
  btnBriefNext.addEventListener("click", () => {
    const briefEl = document.getElementById("brief");
    if (!(briefEl instanceof HTMLTextAreaElement)) return;
    briefEl.value = pickNextBrief();
    briefEl.focus();
    briefEl.setSelectionRange(briefEl.value.length, briefEl.value.length);
  });

  btnApiKeyToggle.addEventListener("click", () => {
    const input = document.getElementById("apiKey");
    if (!(input instanceof HTMLInputElement)) return;
    input.type = input.type === "password" ? "text" : "password";
    syncApiKeyToggleUi();
  });

  syncApiKeyToggleUi();

  setupModelSelects();
}

function isDemoHtmlPage(): boolean {
  return /\/demo\.html$/i.test(window.location.pathname);
}

function init(): void {
  const loaded = loadSharePayloadFromLocation();
  if (loaded === "invalid") {
    showShareDecodeError();
  } else if (loaded) {
    if (loaded.source === "demo" && !isDemoHtmlPage()) {
      const next = new URL("demo.html", window.location.href);
      next.hash = window.location.hash;
      window.location.replace(next.href);
      return;
    }
    wireLiveShareViewer(loaded);
    return;
  }
  wireApp();
}

export function bootstrapLiveApp(): void {
  try {
    init();
  } catch (err) {
    console.error(err);
    const el = document.getElementById("errorMsg");
    if (el) {
      el.textContent =
        err instanceof Error
          ? err.message
          : "Something went wrong while starting the app.";
      el.style.display = "block";
    }
  }
}
