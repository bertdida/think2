import type { ParsedUsage } from "./openrouter-usage.js";

export const SHARE_HASH_PREFIX = "v1.";

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

/** Max compressed payload (base64-decoded) before gunzip. */
const MAX_COMPRESSED_BYTES = 512 * 1024;

/** Max UTF-8 length of decompressed JSON string. */
const MAX_JSON_CHARS = 512 * 1024;

export interface ShareUsageStepV1 {
  id: string;
  model: string;
  usage: ParsedUsage;
}

export interface SharePayloadV1 {
  v: 1;
  brief: string;
  strategist: string;
  critic: string;
  synthesizer: string;
  rounds: Record<string, string>;
  usageSteps?: readonly ShareUsageStepV1[];
  /** Present when the link was created from the offline demo page. */
  source?: "demo";
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(b64url: string): Uint8Array {
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

async function gzipBytes(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream("gzip");
  const writer = cs.writable.getWriter();
  await writer.write(new Uint8Array(data));
  await writer.close();
  const buf = await new Response(cs.readable).arrayBuffer();
  return new Uint8Array(buf);
}

async function gunzipBytes(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("gzip");
  const writer = ds.writable.getWriter();
  await writer.write(new Uint8Array(data));
  await writer.close();
  const buf = await new Response(ds.readable).arrayBuffer();
  return new Uint8Array(buf);
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function isParsedUsage(o: unknown): o is ParsedUsage {
  if (!isRecord(o)) return false;
  const n = (x: unknown): boolean =>
    x === null || (typeof x === "number" && Number.isFinite(x));
  return (
    n(o.prompt) && n(o.completion) && n(o.total) && n(o.cost)
  );
}

function isUsageStep(x: unknown): x is ShareUsageStepV1 {
  if (!isRecord(x)) return false;
  if (typeof x.id !== "string" || typeof x.model !== "string") return false;
  return isParsedUsage(x.usage);
}

export function parseSharePayloadV1(raw: unknown): SharePayloadV1 | null {
  if (!isRecord(raw)) return null;
  if (raw.v !== 1) return null;
  if (typeof raw.brief !== "string") return null;
  if (typeof raw.strategist !== "string" || !MODEL_ID_RE.test(raw.strategist))
    return null;
  if (typeof raw.critic !== "string" || !MODEL_ID_RE.test(raw.critic))
    return null;
  if (
    typeof raw.synthesizer !== "string" ||
    !MODEL_ID_RE.test(raw.synthesizer)
  )
    return null;
  if (!isRecord(raw.rounds)) return null;
  for (const id of SHARE_ROUND_IDS) {
    const t = raw.rounds[id];
    if (typeof t !== "string" || t.trim().length === 0) return null;
  }
  let usageSteps: ShareUsageStepV1[] | undefined;
  if (raw.usageSteps !== undefined) {
    if (!Array.isArray(raw.usageSteps)) return null;
    const steps: ShareUsageStepV1[] = [];
    for (const item of raw.usageSteps) {
      if (!isUsageStep(item)) return null;
      steps.push(item);
    }
    usageSteps = steps;
  }
  let source: "demo" | undefined;
  if (raw.source !== undefined) {
    if (raw.source !== "demo") return null;
    source = "demo";
  }
  return {
    v: 1,
    brief: raw.brief,
    strategist: raw.strategist,
    critic: raw.critic,
    synthesizer: raw.synthesizer,
    rounds: raw.rounds as Record<string, string>,
    usageSteps,
    source,
  };
}

export function buildSharePayloadV1(input: {
  brief: string;
  strategist: string;
  critic: string;
  synthesizer: string;
  rounds: Record<string, string>;
  usageSteps?: readonly ShareUsageStepV1[];
  source?: "demo";
}): SharePayloadV1 {
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
  const payload: SharePayloadV1 = {
    v: 1,
    brief: input.brief,
    strategist: input.strategist,
    critic: input.critic,
    synthesizer: input.synthesizer,
    rounds,
  };
  if (input.usageSteps && input.usageSteps.length > 0) {
    payload.usageSteps = [...input.usageSteps];
  }
  if (input.source === "demo") {
    payload.source = "demo";
  }
  return payload;
}

export function isShareCompressionSupported(): boolean {
  return (
    typeof globalThis.CompressionStream === "function" &&
    typeof globalThis.DecompressionStream === "function"
  );
}

export async function encodeShareHash(payload: SharePayloadV1): Promise<string> {
  if (!isShareCompressionSupported()) {
    throw new Error(
      "This browser does not support CompressionStream (needed to shrink the link). Try an up-to-date Chrome, Firefox, Edge, or Safari.",
    );
  }
  const json = JSON.stringify(payload);
  if (json.length > MAX_JSON_CHARS) {
    throw new Error("Session is too large to share in a URL.");
  }
  const encoded = new TextEncoder().encode(json);
  const gz = await gzipBytes(encoded);
  return `${SHARE_HASH_PREFIX}${bytesToBase64Url(gz)}`;
}

export async function decodeSharePayloadFromHash(
  hashWithoutPound: string,
): Promise<SharePayloadV1 | null> {
  try {
    const trimmed = hashWithoutPound.trim();
    if (!trimmed.startsWith(SHARE_HASH_PREFIX)) return null;
    const b64part = trimmed.slice(SHARE_HASH_PREFIX.length);
    if (b64part.length === 0) return null;
    let compressed: Uint8Array;
    try {
      compressed = base64UrlToBytes(b64part);
    } catch {
      return null;
    }
    if (compressed.length > MAX_COMPRESSED_BYTES) return null;
    let jsonBytes: Uint8Array;
    try {
      jsonBytes = await gunzipBytes(compressed);
    } catch {
      return null;
    }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(jsonBytes);
    if (text.length > MAX_JSON_CHARS) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      return null;
    }
    return parseSharePayloadV1(parsed);
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
