export const STORAGE_STRATEGIST = "think2.strategistModel";
export const STORAGE_CRITIC = "think2.criticModel";
export const STORAGE_SYNTHESIZER = "think2.synthesizerModel";

export const MODEL_PRESETS: ReadonlyArray<{ value: string; label: string }> = [
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

function presetValues(): Set<string> {
  return new Set(MODEL_PRESETS.map((p) => p.value));
}

export function fillSelect(
  selectId: string,
  storageKey: string,
  fallbackValue: string,
): void {
  const el = document.getElementById(selectId);
  if (!(el instanceof HTMLSelectElement)) {
    throw new Error(`Missing select #${selectId}`);
  }
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

/** Fills options and sets value without persisting changes (demo frozen selects). */
export function fillSelectDisabled(selectId: string, fallbackValue: string): void {
  const el = document.getElementById(selectId);
  if (!(el instanceof HTMLSelectElement)) {
    throw new Error(`Missing select #${selectId}`);
  }
  el.replaceChildren();
  for (const o of MODEL_PRESETS) {
    const opt = document.createElement("option");
    opt.value = o.value;
    opt.textContent = o.label;
    el.appendChild(opt);
  }
  el.value = fallbackValue;
  el.disabled = true;
}

export function ensureSelectHasValue(sel: HTMLSelectElement, value: string): void {
  const ids = new Set(Array.from(sel.options, (o) => o.value));
  if (!ids.has(value)) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    sel.appendChild(opt);
  }
  sel.value = value;
}

export function setupModelSelects(): void {
  fillSelect(
    "strategistModel",
    STORAGE_STRATEGIST,
    "anthropic/claude-sonnet-4.6",
  );
  fillSelect("criticModel", STORAGE_CRITIC, "google/gemini-2.5-pro");
  fillSelect(
    "synthesizerModel",
    STORAGE_SYNTHESIZER,
    "anthropic/claude-sonnet-4.6",
  );
}
