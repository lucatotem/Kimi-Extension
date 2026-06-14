// src/modelDiscovery.ts
// Fetches available models from Kimi's GET /v1/models endpoint.
// https://platform.kimi.ai/docs/api/list-models

import type { KimiModel, KimiModelsResponse } from "./types";

/**
 * Fetch the list of available Kimi models.
 *
 * @param baseUrl  The base URL of the Kimi API (e.g. https://api.moonshot.ai/v1).
 * @param apiKey   The API key for authentication.
 * @returns        An array of KimiModel objects.
 */
export async function fetchKimiModels(
  baseUrl: string,
  apiKey: string,
): Promise<KimiModel[]> {
  const url = `${baseUrl.replace(/\/$/, "")}/models`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "<unreadable>");
    throw new Error(
      `Kimi model discovery failed: ${response.status} ${response.statusText}\n${body}`,
    );
  }

  const payload = (await response.json()) as KimiModelsResponse;

  if (!payload.data || !Array.isArray(payload.data)) {
    throw new Error(
      "Kimi model discovery returned an unexpected response shape. Expected { data: [...] }.",
    );
  }

  return payload.data;
}
