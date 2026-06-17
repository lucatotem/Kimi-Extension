// src/endpoints.ts
// Shared endpoint defaults and helpers for Moonshot and Kimi Code APIs.

export const DEFAULT_BASE_URL = "https://api.moonshot.ai/v1";
export const KIMI_CODE_BASE_URL = "https://api.kimi.com/coding/v1";
export const KIMI_CODE_MODEL_ID = "kimi-for-coding";

export function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");

  try {
    const url = new URL(trimmed);
    if (url.hostname.toLowerCase() === "api.kimi.com" && trimPath(url.pathname) === "/coding") {
      url.pathname = "/coding/v1";
      return url.toString().replace(/\/+$/, "");
    }
  } catch {
    // Leave invalid or partial URLs untouched so fetch reports the real error.
  }

  return trimmed;
}

export function isKimiCodeBaseUrl(baseUrl: string): boolean {
  const normalized = normalizeBaseUrl(baseUrl);

  try {
    const url = new URL(normalized);
    return url.hostname.toLowerCase() === "api.kimi.com" && trimPath(url.pathname).startsWith(
      "/coding",
    );
  } catch {
    return normalized.toLowerCase().includes("api.kimi.com/coding");
  }
}

function trimPath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed || "/";
}
