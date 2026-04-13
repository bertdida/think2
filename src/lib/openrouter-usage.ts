export interface ParsedUsage {
  prompt: number | null;
  completion: number | null;
  total: number | null;
  cost: number | null;
}

export function parseOpenRouterUsage(usage: unknown): ParsedUsage {
  const empty: ParsedUsage = {
    prompt: null,
    completion: null,
    total: null,
    cost: null,
  };
  if (!usage || typeof usage !== "object") return empty;
  const o = usage as Record<string, unknown>;
  const readNum = (k: string): number | null => {
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
