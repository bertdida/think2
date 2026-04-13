import { describe, expect, it } from "vitest";
import {
  buildSharePayload,
  decodeSharePayloadFromHash,
  encodeShareHash,
  encodeShareHashFromJson,
  parseSharePayload,
  SHARE_HASH_PREFIX,
} from "./share-payload.js";

const minimalRounds = (): Record<string, string> => ({
  r1: "a",
  r2: "b",
  r3: "c",
  r4: "d",
  r5: "e",
  r6: "f",
  r7: "g",
  r8: "h",
  r9: "i",
});

describe("share-payload encode/decode", () => {
  it("encode then decode returns equivalent payload", () => {
    const payload = buildSharePayload({
      brief: "Situation text",
      planner: "anthropic/claude-sonnet-4.6",
      challenger: "google/gemini-2.5-pro",
      resolver: "openai/gpt-5",
      rounds: minimalRounds(),
      source: "demo",
    });
    const hash = encodeShareHash(payload);
    expect(hash.startsWith(SHARE_HASH_PREFIX)).toBe(true);
    const fromJson = encodeShareHashFromJson(JSON.stringify(payload));
    expect(fromJson).toBe(hash);
    const decoded = decodeSharePayloadFromHash(hash);
    expect(decoded).toEqual(payload);
  });

  it("decode rejects invalid hashes", () => {
    expect(decodeSharePayloadFromHash("v2.")).toBeNull();
    expect(decodeSharePayloadFromHash("v0.xxx")).toBeNull();
    expect(decodeSharePayloadFromHash("v2!!!")).toBeNull();
  });
});

describe("share-payload validation", () => {
  it("parseSharePayload rejects missing round", () => {
    const bad = {
      brief: "x",
      planner: "a/b",
      challenger: "c/d",
      resolver: "e/f",
      rounds: { ...minimalRounds(), r9: "" },
    };
    expect(parseSharePayload(bad)).toBeNull();
  });

  it("buildSharePayload throws on empty round", () => {
    expect(() =>
      buildSharePayload({
        brief: "b",
        planner: "anthropic/claude-sonnet-4.6",
        challenger: "google/gemini-2.5-pro",
        resolver: "openai/gpt-5",
        rounds: { ...minimalRounds(), r3: "   " },
      }),
    ).toThrow(/r3/);
  });

  it("buildSharePayload throws on error marker", () => {
    expect(() =>
      buildSharePayload({
        brief: "b",
        planner: "anthropic/claude-sonnet-4.6",
        challenger: "google/gemini-2.5-pro",
        resolver: "openai/gpt-5",
        rounds: { ...minimalRounds(), r2: "[error]" },
      }),
    ).toThrow(/error/);
  });
});
