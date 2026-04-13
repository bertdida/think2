import { appendRoundCard, escapeHtml } from "./shared.js";
import type { ModelKey } from "./debate-rounds.js";
import { ROUNDS } from "./debate-rounds.js";
import { ensureSelectHasValue, setupModelSelects } from "./model-selects.js";
import { parseOpenRouterUsage } from "./openrouter-usage.js";
import type { SharePayload } from "./share-payload.js";
import { shareUrlWithHash } from "./share-payload.js";
import {
  resetShareCopyButton,
  startShareCopyLoading,
} from "./share-copy-ui.js";
import { clearShareUrlCache } from "./share-url-cache.js";
import {
  clearSessionUsageSummary,
  mountRoundUsageFooter,
} from "./usage-display.js";

export function showSessionDoneChrome(): void {
  const wrap = document.getElementById("sessionDoneActions");
  const hint = document.getElementById("shareLinkHint");
  const btnShareLink = document.getElementById("btnShareLink");
  if (wrap) wrap.removeAttribute("hidden");
  if (hint) hint.removeAttribute("hidden");
  if (btnShareLink instanceof HTMLButtonElement) {
    resetShareCopyButton(btnShareLink);
    btnShareLink.disabled = false;
  }
  const btnReset = document.getElementById("btnReset");
  if (btnReset instanceof HTMLButtonElement) {
    btnReset.disabled = false;
  }
}

export function hideSessionDoneChrome(): void {
  const wrap = document.getElementById("sessionDoneActions");
  const hint = document.getElementById("shareLinkHint");
  if (wrap) wrap.setAttribute("hidden", "");
  if (hint) hint.setAttribute("hidden", "");
  const btnShareLink = document.getElementById("btnShareLink");
  if (btnShareLink instanceof HTMLButtonElement) {
    resetShareCopyButton(btnShareLink);
    btnShareLink.disabled = true;
  }
  const btnReset = document.getElementById("btnReset");
  if (btnReset instanceof HTMLButtonElement) {
    btnReset.disabled = true;
  }
  clearShareUrlCache();
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
  applyPayloadToSessionState: (rounds: Record<string, string>) => void;
}

export function renderSessionFromSnapshot(
  payload: SharePayload,
  models: Record<ModelKey, string>,
): void {
  const timeline = document.getElementById("timeline");
  if (timeline) timeline.innerHTML = "";
  clearSessionUsageSummary();

  models.strategist = payload.planner;
  models.critic = payload.challenger;
  models.synthesizer = payload.resolver;

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
    mountRoundUsageFooter(card, model, parseOpenRouterUsage(null));
  }
}

export function wireShareViewer(
  payload: SharePayload,
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
  ensureSelectHasValue(strategistEl, payload.planner);
  ensureSelectHasValue(criticEl, payload.challenger);
  ensureSelectHasValue(synthesizerEl, payload.resolver);
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

  sink.applyPayloadToSessionState(payload.rounds);

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
    if (btnShareLink.disabled) return;
    const ui = startShareCopyLoading(btnShareLink);
    try {
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
        ui.cancelLoading();
        return;
      }
      ui.showCopiedThenReset();
    } catch {
      ui.cancelLoading();
    }
  });

  window.scrollTo({ top: 0, behavior: "auto" });
}
