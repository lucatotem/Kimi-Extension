// src/kimiClient.ts
// Low-level HTTP client for the Kimi/Moonshot Chat Completions API.
// Handles streaming SSE responses and dispatches parsed deltas.

import type { KimiMessage, StreamHandlerOptions } from "./types";

/**
 * Send a streaming chat completion request to Kimi and process the SSE stream.
 *
 * @param baseUrl  Kimi API base URL (e.g. https://api.moonshot.ai/v1).
 * @param apiKey   Bearer token for authentication.
 * @param body     The full request body (model, messages, max_tokens, etc.).
 * @param signal   AbortSignal for cancellation.
 * @param handlers Callbacks for stream events.
 */
export async function streamChatCompletion(
  baseUrl: string,
  apiKey: string,
  body: Record<string, unknown>,
  signal: AbortSignal,
  handlers: StreamHandlerOptions,
): Promise<void> {
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ ...body, stream: true }),
    signal,
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text().catch(() => "<unreadable>");
    throw new Error(
      `Kimi chat request failed: ${response.status} ${response.statusText}\n${errorText}`,
    );
  }

  await parseSSEStream(response.body, handlers);
}

// ── SSE parser ─────────────────────────────────────────────────────────

/**
 * Parse a Server-Sent Events stream from the Kimi API.
 *
 * Kimi streams chunks where each delta may contain:
 *   - `reasoning_content`  (thinking models, appears before `content`)
 *   - `content`            (the normal assistant response)
 *   - `tool_calls`         (function-calling deltas)
 *
 * The parser:
 *   1. Splits the byte stream on double-newlines into events.
 *   2. Extracts `data:` lines.
 *   3. Dispatches `reasoning_content` and `content` via `handlers.onText`.
 */
async function parseSSEStream(
  body: ReadableStream<Uint8Array>,
  handlers: StreamHandlerOptions,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split on double-newline (SSE event boundary)
      const events = buffer.split("\n\n");
      // The last element may be incomplete — keep it in the buffer
      buffer = events.pop() ?? "";

      for (const event of events) {
        processSSEEvent(event, handlers);
      }
    }

    // Flush any remaining data
    if (buffer.trim()) {
      processSSEEvent(buffer, handlers);
    }
  } finally {
    reader.releaseLock();
  }
}

/** Process a single SSE event block. */
function processSSEEvent(
  event: string,
  handlers: StreamHandlerOptions,
): void {
  // Extract lines starting with "data: "
  const dataLines = event
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice("data: ".length));

  for (const data of dataLines) {
    const trimmed = data.trim();
    if (trimmed === "[DONE]") return;

    try {
      const json = JSON.parse(trimmed);
      const delta = json.choices?.[0]?.delta;
      if (!delta) continue;

      // Reasoning content (hidden by default)
      if (delta.reasoning_content && handlers.showReasoning) {
        handlers.onText(`\n\n[reasoning]\n${delta.reasoning_content}`);
      }

      // Normal content
      if (delta.content) {
        handlers.onText(delta.content);
      }

      // Tool calls (future: aggregate and dispatch)
      if (delta.tool_calls && handlers.onToolCall) {
        for (const call of delta.tool_calls) {
          handlers.onToolCall(call);
        }
      }
    } catch {
      // Malformed SSE fragments are silently ignored.
      // This can happen when the stream is split mid-JSON object.
    }
  }
}
