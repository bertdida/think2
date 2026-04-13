import { appendRoundCard, escapeHtml } from "./shared.js";
import type { ModelKey } from "./debate-rounds.js";
import { ROUNDS } from "./debate-rounds.js";
import { ensureSelectHasValue, setupModelSelects } from "./model-selects.js";
import { parseOpenRouterUsage } from "./openrouter-usage.js";
import type { SharePayloadV1, ShareUsageStepV1 } from "./share-payload.js";
import { shareUrlWithHash } from "./share-payload.js";
import {
  addUsageToSessionAgg,
  clearSessionUsageSummary,
  createEmptySessionUsageAgg,
  mountRoundUsageFooter,
  renderSessionUsageSummary,
} from "./usage-display.js";

export function showSessionDoneChrome(): void {
  const wrap = document.getElementById("sessionDoneActions");
  const hint = document.getElementById("shareLinkHint");
  if (wrap) wrap.removeAttribute("hidden");
  if (hint) hint.removeAttribute("hidden");
}

export function hideSessionDoneChrome(): void {
  const wrap = document.getElementById("sessionDoneActions");
  const hint = document.getElementById("shareLinkHint");
  if (wrap) wrap.setAttribute("hidden", "");
  if (hint) hint.setAttribute("hidden", "");
}

export function showShareDecodeError(): void {
  const el = document.getElementById("shareLoadError");
  if (!el) return;
  el.textContent =
    "This share link is missing data or could not be read. You can still run a new session below.";
  el.removeAttribute("hidden");
}

export function startYourOwn(): void {
  window.location.assign(
    `${window.location.origin}${window.location.pathname}${window.location.search}`,
  );
}

export interface ShareViewerSessionSink {
  models: Record<ModelKey, string>;
  applyPayloadToSessionState: (
    rounds: Record<string, string>,
    usageSteps: readonly ShareUsageStepV1[] | undefined,
  ) => void;
}

export function renderSessionFromSnapshot(
  payload: SharePayloadV1,
  models: Record<ModelKey, string>,
): void {
  const timeline = document.getElementById("timeline");
  if (timeline) timeline.innerHTML = "";
  clearSessionUsageSummary();

  models.strategist = payload.strategist;
  models.critic = payload.critic;
  models.synthesizer = payload.synthesizer;

  for (const round of ROUNDS) {
    const { card, contentEl, typingEl } = appendRoundCard({
      id: round.id,
      speaker: round.speaker,
      cls: round.cls,
      label: round.label,
    });
    typingEl.style.display = "none";
    const text = payload.rounds[round.id] ?? "";
    contentEl.innerHTML = `<span class="stream-text">${escapeHtml(text)}</span>`;
    const model = models[round.modelKey];
    const step = payload.usageSteps?.find((s) => s.id === round.id);
    mountRoundUsageFooter(
      card,
      model,
      step?.usage ?? parseOpenRouterUsage(null),
    );
  }

  if (payload.usageSteps && payload.usageSteps.length > 0) {
    const agg = createEmptySessionUsageAgg();
    for (const s of payload.usageSteps) {
      addUsageToSessionAgg(agg, s.usage);
    }
    const isDemo = payload.source === "demo";
    renderSessionUsageSummary(agg, {
      sessionTitle: isDemo
        ? "Session (demo — illustrative)"
        : "Session (OpenRouter)",
      footnote: isDemo
        ? "Totals are placeholders; the demo page does not call OpenRouter."
        : undefined,
    });
  }
}

export function wireShareViewer(
  payload: SharePayloadV1,
  sink: ShareViewerSessionSink,
): void {
  const banner = document.getElementById("shareViewBanner");
  if (banner) banner.removeAttribute("hidden");

  const apiWrap = document.getElementById("apiKeyFieldWrap");
  if (apiWrap) apiWrap.hidden = true;

  setupModelSelects();
  const strategistEl = document.getElementById("strategistModel");
  const criticEl = document.getElementById("criticModel");
  const synthesizerEl = document.getElementById("synthesizerModel");
  const briefEl = document.getElementById("brief");
  if (
    !(strategistEl instanceof HTMLSelectElement) ||
    !(criticEl instanceof HTMLSelectElement) ||
    !(synthesizerEl instanceof HTMLSelectElement) ||
    !(briefEl instanceof HTMLTextAreaElement)
  ) {
    throw new Error("Missing form controls for share view.");
  }
  ensureSelectHasValue(strategistEl, payload.strategist);
  ensureSelectHasValue(criticEl, payload.critic);
  ensureSelectHasValue(synthesizerEl, payload.synthesizer);
  briefEl.value = payload.brief;
  briefEl.readOnly = true;
  strategistEl.disabled = true;
  criticEl.disabled = true;
  synthesizerEl.disabled = true;

  const apiKeyEl = document.getElementById("apiKey");
  if (apiKeyEl instanceof HTMLInputElement) {
    apiKeyEl.disabled = true;
    apiKeyEl.value = "";
  }

  const btnStart = document.getElementById("btnStart");
  if (btnStart instanceof HTMLButtonElement) btnStart.disabled = true;
  const btnBriefClear = document.getElementById("btnBriefClear");
  const btnBriefNext = document.getElementById("btnBriefNext");
  const btnApiKeyToggle = document.getElementById("btnApiKeyToggle");
  if (btnBriefClear instanceof HTMLButtonElement)
    btnBriefClear.disabled = true;
  if (btnBriefNext instanceof HTMLButtonElement) btnBriefNext.disabled = true;
  if (btnApiKeyToggle instanceof HTMLButtonElement)
    btnApiKeyToggle.disabled = true;

  sink.applyPayloadToSessionState(payload.rounds, payload.usageSteps);

  renderSessionFromSnapshot(payload, sink.models);

  showSessionDoneChrome();

  const btnReset = document.getElementById("btnReset");
  const btnShareLink = document.getElementById("btnShareLink");
  if (!(btnReset instanceof HTMLButtonElement)) {
    throw new Error("Missing #btnReset");
  }
  if (!(btnShareLink instanceof HTMLButtonElement)) {
    throw new Error("Missing #btnShareLink");
  }
  btnReset.addEventListener("click", startYourOwn);
  btnShareLink.addEventListener("click", async () => {
    const hashPart = window.location.hash.replace(/^#/, "");
    const url = shareUrlWithHash(
      window.location.origin,
      window.location.pathname,
      hashPart,
    );
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link:", url);
    }
    const prev = btnShareLink.textContent;
    btnShareLink.textContent = "Copied";
    window.setTimeout(() => {
      btnShareLink.textContent = prev;
    }, 2000);
  });

  window.scrollTo({ top: 0, behavior: "auto" });
}
