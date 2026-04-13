import { describe, expect, it } from "vitest";
import { parseOpenRouterUsage } from "./openrouter-usage.js";

describe("parseOpenRouterUsage", () => {
  it("returns empty fields for non-object input", () => {
    expect(parseOpenRouterUsage(null)).toEqual({
      prompt: null,
      completion: null,
      total: null,
      cost: null,
    });
  });

  it("reads token and cost fields when present", () => {
    expect(
      parseOpenRouterUsage({
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
        cost: 0.001234,
      }),
    ).toEqual({
      prompt: 10,
      completion: 20,
      total: 30,
      cost: 0.001234,
    });
  });
});
