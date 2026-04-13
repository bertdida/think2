import { decodeSharePayloadFromHash } from "./share-payload.js";
import type { SharePayloadV1 } from "./share-payload.js";

/**
 * If the URL hash is a share payload, decodes it and returns the result.
 * Returns `null` when there is no `v1.` hash or decoding fails (caller may show an error).
 */
export async function loadSharePayloadFromLocation(): Promise<
  SharePayloadV1 | null | "invalid"
> {
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw.startsWith("v1.")) return null;
  try {
    const payload = await decodeSharePayloadFromHash(raw);
    if (payload) return payload;
    return "invalid";
  } catch {
    return "invalid";
  }
}
