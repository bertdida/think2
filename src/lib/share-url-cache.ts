import type { SharePayload } from "./share-payload.js";
import {
  encodeShareHashFromJson,
  shareUrlWithHash,
} from "./share-payload.js";

let cachedJson: string | null = null;
let cachedUrl: string | null = null;

export function clearShareUrlCache(): void {
  cachedJson = null;
  cachedUrl = null;
}

export function primeShareUrlCache(
  payload: SharePayload,
  origin: string,
  pathname: string,
): void {
  const json = JSON.stringify(payload);
  try {
    const hash = encodeShareHashFromJson(json);
    const url = shareUrlWithHash(origin, pathname, hash);
    cachedJson = json;
    cachedUrl = url;
  } catch {
    clearShareUrlCache();
  }
}

export function resolveShareUrlForClipboard(
  payload: SharePayload,
  origin: string,
  pathname: string,
): string {
  const json = JSON.stringify(payload);
  if (cachedJson === json && cachedUrl) {
    return cachedUrl;
  }
  const hash = encodeShareHashFromJson(json);
  const url = shareUrlWithHash(origin, pathname, hash);
  cachedJson = json;
  cachedUrl = url;
  return url;
}
