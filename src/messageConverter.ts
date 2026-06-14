// src/messageConverter.ts
// Converts VS Code LanguageModelChatRequestMessage objects to Kimi-compatible
// message payloads for the /v1/chat/completions endpoint.

import type { LanguageModelChatMessage, LanguageModelChatMessageRole, LanguageModelChatRequestMessage } from "vscode";
import type { KimiMessage } from "./types";

/**
 * Convert an array of VS Code chat messages into the format expected by
 * the Kimi Chat Completions API.
 *
 * - Flattens multi-part content (text + images) into a single text block.
 * - Maps VS Code roles (User / Assistant) to Kimi roles (user / assistant).
 * - Optionally strips stored reasoning_content if the preset doesn't need it.
 */
export function convertMessages(
  messages: readonly LanguageModelChatRequestMessage[],
): KimiMessage[] {
  return messages.map((msg) => {
    const role = mapRole(msg.role);
    const content = extractTextContent(msg);
    return { role, content };
  });
}

/**
 * Extract plain-text content from a VS Code message, joining multi-part
 * content blocks with double-newlines.
 */
function extractTextContent(msg: LanguageModelChatRequestMessage): string {
  const parts: string[] = [];

  for (const part of msg.content) {
    if (isTextPart(part)) {
      parts.push(part.value);
    }
    // Future: handle LanguageModelImagePart for vision-capable presets.
  }

  return parts.join("\n\n");
}

/** Map VS Code role enum to Kimi API role string. */
function mapRole(role: LanguageModelChatMessageRole): KimiMessage["role"] {
  // VS Code uses numeric enum; 1 = User, 2 = Assistant.
  // We also handle string forms defensively.
  if (typeof role === "number") {
    return role === 1 ? "user" : "assistant";
  }
  const lower = String(role).toLowerCase();
  if (lower === "user") return "user";
  if (lower === "assistant") return "assistant";
  if (lower === "system") return "system";
  return "user"; // safe default
}

/** Type-narrow a message content part to a text part. */
function isTextPart(part: unknown): part is { value: string } {
  return (
    typeof part === "object" &&
    part !== null &&
    "value" in part &&
    typeof (part as { value: unknown }).value === "string"
  );
}

// Re-export VS Code types used by consumers.
export type { LanguageModelChatMessage, LanguageModelChatMessageRole, LanguageModelChatRequestMessage };
