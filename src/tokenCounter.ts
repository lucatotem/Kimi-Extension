// src/tokenCounter.ts
// Provides token-count estimation for Kimi models.

import type { LanguageModelChatRequestMessage } from "vscode";
import type { TokenCountResult } from "./types";

/**
 * Estimate the token count for a given piece of text or VS Code message.
 *
 * Currently uses a character / 4 approximation. This is a common rule-of-thumb
 * for English text with most LLM tokenizers. Kimi's tokenizer may differ
 * slightly, but this is sufficient for VS Code's `provideTokenCount` contract.
 *
 * Future: call `POST /v1/tokenize` for exact counts when Kimi exposes it.
 */
export function estimateTokenCount(
  input: string | LanguageModelChatRequestMessage,
  charsPerToken = 4,
): TokenCountResult {
  const raw = typeof input === "string" ? input : messageToString(input);
  return {
    tokens: Math.ceil(raw.length / Math.max(charsPerToken, 1)),
    method: "approximation",
  };
}

/** Flatten a VS Code chat message to a single string for estimation. */
function messageToString(msg: LanguageModelChatRequestMessage): string {
  const parts: string[] = [];

  for (const part of msg.content) {
    if (
      typeof part === "object" &&
      part !== null &&
      "value" in part &&
      typeof (part as { value: unknown }).value === "string"
    ) {
      parts.push((part as { value: string }).value);
    } else if (
      typeof part === "object" &&
      part !== null &&
      "data" in part &&
      (part as { data?: unknown }).data instanceof Uint8Array
    ) {
      parts.push(`[binary:${(part as { data: Uint8Array }).data.byteLength}]`);
    }
  }

  return parts.join("\n");
}
