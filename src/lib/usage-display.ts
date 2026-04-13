import type { ParsedUsage } from "./openrouter-usage.js";

/** Per-round usage captured during a live or demo run (not part of share URL JSON). */
export interface SessionUsageStep {
  id: string;
  model: string;
  usage: ParsedUsage;
}

const usageMoneyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
  maximumFractionDigits: 6,
});

function usageHasAnyTokenOrCost(u: ParsedUsage): boolean {
  return (
    u.prompt != null ||
    u.completion != null ||
    u.total != null ||
    u.cost != null
  );
}

function sessionTokenContribution(u: ParsedUsage): number | null {
  if (u.total != null) return u.total;
  if (u.prompt != null && u.completion != null) return u.prompt + u.completion;
  return null;
}

export function mountRoundUsageFooter(
  cardEl: HTMLElement,
  modelId: string,
  u: ParsedUsage,
): void {
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
    const parts: string[] = [];
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

export interface SessionUsageAgg {
  tokensSum: number;
  tokenRounds: number;
  costSum: number;
  costRounds: number;
}

export function createEmptySessionUsageAgg(): SessionUsageAgg {
  return {
    tokensSum: 0,
    tokenRounds: 0,
    costSum: 0,
    costRounds: 0,
  };
}

export function addUsageToSessionAgg(agg: SessionUsageAgg, u: ParsedUsage): void {
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

export interface SessionUsageSummaryOptions {
  /** e.g. "Session" */
  sessionTitle: string;
}

export function renderSessionUsageSummary(
  agg: SessionUsageAgg,
  options: SessionUsageSummaryOptions,
): void {
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
  strong.textContent = options.sessionTitle;
  el.appendChild(strong);
  const desc = document.createElement("p");
  desc.style.margin = "6px 0 0";
  const bits: string[] = [];
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

export function clearSessionUsageSummary(): void {
  const el = document.getElementById("sessionUsage");
  if (!el) return;
  el.replaceChildren();
  el.hidden = true;
}
