import {
  decodeSharePayloadFromHash,
  SHARE_HASH_PREFIX,
  type SharePayload,
} from "./share-payload.js";

/**
 * If the URL hash is a share payload, decodes it and returns the result.
 * Returns `null` when there is no share hash or decoding fails.
 */
export function loadSharePayloadFromLocation():
  | SharePayload
  | null
  | "invalid" {
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw.startsWith(SHARE_HASH_PREFIX)) return null;
  const payload = decodeSharePayloadFromHash(raw);
  if (payload) return payload;
  return "invalid";
}
