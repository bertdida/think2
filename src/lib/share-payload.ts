/** Marks a share payload in the URL fragment (UTF-8 JSON → base64url). */
export const SHARE_HASH_PREFIX = "v2.";

export const SHARE_ROUND_IDS = [
  "r1",
  "r2",
  "r3",
  "r4",
  "r5",
  "r6",
  "r7",
  "r8",
  "r9",
] as const;

export type ShareRoundId = (typeof SHARE_ROUND_IDS)[number];

const MODEL_ID_RE = /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/i;

const MAX_JSON_CHARS = 512 * 1024;
const MAX_B64_DECODED_BYTES = 768 * 1024;

export interface SharePayload {
  brief: string;
  planner: string;
  challenger: string;
  resolver: string;
  rounds: Record<string, string>;
  source?: "demo";
}

type Base64Alphabet = "base64" | "base64url";

interface Uint8ArrayToBase64 {
  toBase64?(options?: { alphabet?: Base64Alphabet }): string;
}

interface Uint8ArrayConstructorFromBase64 {
  fromBase64?(
    data: string,
    options?: { alphabet?: Base64Alphabet },
  ): Uint8Array;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const toB64 = (bytes as Uint8Array & Uint8ArrayToBase64).toBase64;
  if (typeof toB64 === "function") {
    return toB64.call(bytes, { alphabet: "base64url" });
  }
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const FromB64 = Uint8Array as unknown as Uint8ArrayConstructorFromBase64;
  if (typeof FromB64.fromBase64 === "function") {
    try {
      return FromB64.fromBase64(b64url, { alphabet: "base64url" });
    } catch {
      /* fall through to atob path */
    }
  }
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad === 2) b64 += "==";
  else if (pad === 3) b64 += "=";
  else if (pad === 1) throw new Error("Invalid base64url length.");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

export function parseSharePayload(raw: unknown): SharePayload | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.brief !== "string") return null;
  if (typeof raw.planner !== "string" || !MODEL_ID_RE.test(raw.planner))
    return null;
  if (typeof raw.challenger !== "string" || !MODEL_ID_RE.test(raw.challenger))
    return null;
  if (typeof raw.resolver !== "string" || !MODEL_ID_RE.test(raw.resolver))
    return null;
  if (!isRecord(raw.rounds)) return null;
  for (const id of SHARE_ROUND_IDS) {
    const t = raw.rounds[id];
    if (typeof t !== "string" || t.trim().length === 0) return null;
  }
  let source: "demo" | undefined;
  if (raw.source !== undefined) {
    if (raw.source !== "demo") return null;
    source = "demo";
  }
  const out: SharePayload = {
    brief: raw.brief,
    planner: raw.planner,
    challenger: raw.challenger,
    resolver: raw.resolver,
    rounds: raw.rounds as Record<string, string>,
  };
  if (source) out.source = source;
  return out;
}

export function buildSharePayload(input: {
  brief: string;
  planner: string;
  challenger: string;
  resolver: string;
  rounds: Record<string, string>;
  source?: "demo";
}): SharePayload {
  const rounds: Record<string, string> = {};
  for (const id of SHARE_ROUND_IDS) {
    const t = input.rounds[id];
    if (typeof t !== "string" || t.trim().length === 0) {
      throw new Error(`Cannot share: missing or empty round ${id}.`);
    }
    if (t === "[error]" || t.startsWith("Error:")) {
      throw new Error("Cannot share a session that ended in an error.");
    }
    rounds[id] = t;
  }
  const payload: SharePayload = {
    brief: input.brief,
    planner: input.planner,
    challenger: input.challenger,
    resolver: input.resolver,
    rounds,
  };
  if (input.source === "demo") {
    payload.source = "demo";
  }
  return payload;
}

export function encodeShareHashFromJson(json: string): string {
  if (json.length > MAX_JSON_CHARS) {
    throw new Error("Session is too large to share in a URL.");
  }
  const encoded = new TextEncoder().encode(json);
  return `${SHARE_HASH_PREFIX}${bytesToBase64Url(encoded)}`;
}

export function encodeShareHash(payload: SharePayload): string {
  return encodeShareHashFromJson(JSON.stringify(payload));
}

export function decodeSharePayloadFromHash(
  hashWithoutPound: string,
): SharePayload | null {
  try {
    const trimmed = hashWithoutPound.trim();
    if (!trimmed.startsWith(SHARE_HASH_PREFIX)) return null;
    const b64part = trimmed.slice(SHARE_HASH_PREFIX.length);
    if (b64part.length === 0) return null;
    let bytes: Uint8Array;
    try {
      bytes = base64UrlToBytes(b64part);
    } catch {
      return null;
    }
    if (bytes.length > MAX_B64_DECODED_BYTES) return null;
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (text.length > MAX_JSON_CHARS) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      return null;
    }
    return parseSharePayload(parsed);
  } catch {
    return null;
  }
}

export function shareUrlWithHash(
  origin: string,
  pathname: string,
  hash: string,
): string {
  const h = hash.startsWith("#") ? hash : `#${hash}`;
  return `${origin}${pathname}${h}`;
}
