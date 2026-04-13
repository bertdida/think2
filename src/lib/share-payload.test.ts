import { describe, expect, it } from "vitest";
import {
  buildSharePayloadV1,
  decodeSharePayloadFromHash,
  encodeShareHash,
  parseSharePayloadV1,
  SHARE_HASH_PREFIX,
} from "./share-payload.js";

const compressionAvailable =
  typeof globalThis.CompressionStream === "function" &&
  typeof globalThis.DecompressionStream === "function";

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

describe.skipIf(!compressionAvailable)("share-payload gzip roundtrip", () => {
  it("encode then decode returns equivalent payload", async () => {
    const payload = buildSharePayloadV1({
      brief: "Situation text",
      strategist: "anthropic/claude-sonnet-4.6",
      critic: "google/gemini-2.5-pro",
      synthesizer: "openai/gpt-5",
      rounds: minimalRounds(),
      usageSteps: [
        {
          id: "r1",
          model: "anthropic/claude-sonnet-4.6",
          usage: {
            prompt: 1,
            completion: 2,
            total: 3,
            cost: 0.001,
          },
        },
      ],
      source: "demo",
    });
    const hash = await encodeShareHash(payload);
    expect(hash.startsWith(SHARE_HASH_PREFIX)).toBe(true);
    const decoded = await decodeSharePayloadFromHash(hash);
    expect(decoded).toEqual(payload);
  });

  it("rejects invalid hash", async () => {
    expect(await decodeSharePayloadFromHash("v1.")).toBeNull();
    expect(await decodeSharePayloadFromHash("v0.xxx")).toBeNull();
    expect(await decodeSharePayloadFromHash("v1!!!")).toBeNull();
  });
});

describe("share-payload validation", () => {
  it("parseSharePayloadV1 rejects missing round", () => {
    const bad = {
      v: 1,
      brief: "x",
      strategist: "a/b",
      critic: "c/d",
      synthesizer: "e/f",
      rounds: { ...minimalRounds(), r9: "" },
    };
    expect(parseSharePayloadV1(bad)).toBeNull();
  });

  it("buildSharePayloadV1 throws on empty round", () => {
    expect(() =>
      buildSharePayloadV1({
        brief: "b",
        strategist: "anthropic/claude-sonnet-4.6",
        critic: "google/gemini-2.5-pro",
        synthesizer: "openai/gpt-5",
        rounds: { ...minimalRounds(), r3: "   " },
      }),
    ).toThrow(/r3/);
  });

  it("buildSharePayloadV1 throws on error marker", () => {
    expect(() =>
      buildSharePayloadV1({
        brief: "b",
        strategist: "anthropic/claude-sonnet-4.6",
        critic: "google/gemini-2.5-pro",
        synthesizer: "openai/gpt-5",
        rounds: { ...minimalRounds(), r2: "[error]" },
      }),
    ).toThrow(/error/);
  });

});
