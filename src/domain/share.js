import { SHARE_STATE_HASH_KEY } from '../shared/constants.js';

const base64UrlEncodeUtf8 = (value) => {
  if (typeof btoa !== "function") return null;
  const utf8 = encodeURIComponent(String(value)).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
  return btoa(utf8).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};
const base64UrlDecodeUtf8 = (value) => {
  if (typeof atob !== "function") return null;
  const normalized = String(value ?? "").replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(normalized + padding);
  const encoded = Array.from(binary, (char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join("");
  return decodeURIComponent(encoded);
};
const encodeShareSnapshot = (payload) => {
  try {
    return base64UrlEncodeUtf8(JSON.stringify(payload));
  } catch {
    return null;
  }
};
const decodeShareSnapshot = (hashValue) => {
  const rawHash = String(hashValue ?? "").replace(/^#/, "").trim();
  if (!rawHash) return null;
  try {
    const params = new URLSearchParams(rawHash);
    const encoded = params.get(SHARE_STATE_HASH_KEY);
    if (!encoded) return null;
    const decoded = base64UrlDecodeUtf8(encoded);
    if (!decoded) return null;
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
};

export {
  base64UrlEncodeUtf8,
  base64UrlDecodeUtf8,
  encodeShareSnapshot,
  decodeShareSnapshot,
};
