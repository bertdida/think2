import { describe, expect, it } from "vitest";
import { escapeHtml, isDocumentPinnedToBottom } from "./shared.js";

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml(`a<b>"c"&`)).toBe("a&lt;b&gt;&quot;c&quot;&amp;");
  });
});

describe("isDocumentPinnedToBottom", () => {
  it("returns true when root is null", () => {
    expect(isDocumentPinnedToBottom(null)).toBe(true);
  });
});
