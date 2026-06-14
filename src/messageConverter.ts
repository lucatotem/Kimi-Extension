// src/messageConverter.ts
// Converts VS Code LanguageModelChatProvider messages to Kimi chat messages.

import * as vscode from "vscode";
import type {
  KimiContentPart,
  KimiMessage,
  KimiMessageContent,
  KimiRole,
  KimiToolCall,
  KimiToolDefinition,
} from "./types";

const SYSTEM_ROLE = 3;

interface ConvertOptions {
  includeReasoning: boolean;
}

interface ToolResultMessage {
  role: "tool";
  content: string;
  tool_call_id: string;
}

export function convertMessages(
  messages: readonly vscode.LanguageModelChatRequestMessage[],
  options: ConvertOptions,
): KimiMessage[] {
  const result: KimiMessage[] = [];

  for (const msg of messages) {
    const role = mapRole(msg.role);
    const contentParts: KimiContentPart[] = [];
    let textContent = "";
    let reasoningContent = "";
    const toolCalls: KimiToolCall[] = [];
    const toolResults: ToolResultMessage[] = [];

    for (const part of msg.content) {
      if (part instanceof vscode.LanguageModelTextPart) {
        appendText(part.value, contentParts);
        textContent += part.value;
      } else if (isLanguageModelThinkingPart(part)) {
        reasoningContent += normalizeThinkingPartText(part.value);
      } else if (part instanceof vscode.LanguageModelToolCallPart) {
        toolCalls.push({
          id: part.callId,
          type: "function",
          function: {
            name: part.name,
            arguments: safeStringify(part.input),
          },
        });
      } else if (part instanceof vscode.LanguageModelToolResultPart) {
        toolResults.push({
          role: "tool",
          tool_call_id: part.callId,
          content: extractToolResultContent(part),
        });
      } else if (isDataPart(part)) {
        appendDataPart(part, contentParts);
      } else if (isStringValuePart(part)) {
        appendText(part.value, contentParts);
        textContent += part.value;
      }
    }

    const content = normalizeContent(contentParts, textContent);

    if (role === "assistant") {
      if (!isEmptyContent(content) || toolCalls.length > 0) {
        const assistantMessage: KimiMessage = {
          role: "assistant",
          content: isEmptyContent(content) ? "" : content,
        };

        if (toolCalls.length > 0) {
          assistantMessage.tool_calls = toolCalls;
        }
        if (options.includeReasoning && reasoningContent.trim()) {
          assistantMessage.reasoning_content = reasoningContent;
        }

        result.push(assistantMessage);
      }
    } else if (!isEmptyContent(content)) {
      result.push({ role, content });
    }

    for (const toolResult of toolResults) {
      if (toolResult.content.trim()) {
        result.push(toolResult);
      }
    }
  }

  return result;
}

export function convertTools(
  tools: readonly vscode.LanguageModelChatTool[] | undefined,
): KimiToolDefinition[] | undefined {
  if (!tools || tools.length === 0) {
    return undefined;
  }

  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: normalizeToolSchema(tool.inputSchema),
    },
  }));
}

export function countMessageChars(messages: KimiMessage[]): number {
  let total = 0;

  for (const message of messages) {
    total += contentLength(message.content);
    total += message.reasoning_content?.length ?? 0;
    total += message.tool_call_id?.length ?? 0;

    for (const toolCall of message.tool_calls ?? []) {
      total += toolCall.id.length;
      total += toolCall.function.name.length;
      total += toolCall.function.arguments.length;
    }
  }

  return total;
}

function mapRole(role: vscode.LanguageModelChatMessageRole): KimiRole {
  if (role === vscode.LanguageModelChatMessageRole.Assistant) {
    return "assistant";
  }
  if (Number(role) === SYSTEM_ROLE) {
    return "system";
  }
  return "user";
}

function appendText(text: string, parts: KimiContentPart[]): void {
  if (!text) {
    return;
  }
  const last = parts[parts.length - 1];
  if (last?.type === "text") {
    last.text += text;
  } else {
    parts.push({ type: "text", text });
  }
}

function appendDataPart(part: vscode.LanguageModelDataPart, parts: KimiContentPart[]): void {
  if (part.mimeType.startsWith("image/")) {
    parts.push({
      type: "image_url",
      image_url: { url: dataUrl(part.mimeType, part.data) },
    });
    return;
  }

  if (part.mimeType.startsWith("video/")) {
    parts.push({
      type: "video_url",
      video_url: { url: dataUrl(part.mimeType, part.data) },
    });
    return;
  }

  if (part.mimeType.startsWith("text/")) {
    appendText(new TextDecoder().decode(part.data), parts);
  }
}

function normalizeContent(parts: KimiContentPart[], textContent: string): KimiMessageContent {
  const visibleParts = parts.filter((part) => {
    if (part.type === "text") {
      return part.text.trim().length > 0;
    }
    return true;
  });

  if (visibleParts.length === 0) {
    return "";
  }

  const onlyText = visibleParts.every((part) => part.type === "text");
  if (onlyText) {
    return textContent.trim();
  }

  return visibleParts;
}

function isEmptyContent(content: KimiMessageContent): boolean {
  return typeof content === "string" ? content.trim().length === 0 : content.length === 0;
}

function contentLength(content: KimiMessageContent): number {
  if (typeof content === "string") {
    return content.length;
  }

  return content.reduce((total, part) => {
    if (part.type === "text") {
      return total + part.text.length;
    }
    if (part.type === "image_url") {
      return total + part.image_url.url.length;
    }
    return total + part.video_url.url.length;
  }, 0);
}

function extractToolResultContent(part: vscode.LanguageModelToolResultPart): string {
  let text = "";

  for (const item of part.content) {
    if (item instanceof vscode.LanguageModelTextPart) {
      text += item.value;
    } else if (isDataPart(item) && item.mimeType.startsWith("text/")) {
      text += new TextDecoder().decode(item.data);
    } else if (isStringValuePart(item)) {
      text += item.value;
    }
  }

  return text || safeStringify(part.content);
}

function normalizeToolSchema(schema: object | undefined): object {
  if (!schema || Object.keys(schema).length === 0) {
    return { type: "object", properties: {} };
  }
  return schema;
}

function isDataPart(part: unknown): part is vscode.LanguageModelDataPart {
  return part instanceof vscode.LanguageModelDataPart;
}

function isStringValuePart(part: unknown): part is { value: string } {
  return (
    typeof part === "object" &&
    part !== null &&
    "value" in part &&
    typeof (part as { value: unknown }).value === "string"
  );
}

function isLanguageModelThinkingPart(part: unknown): part is { value: string | string[] } {
  const ctor = (vscode as typeof vscode & {
    LanguageModelThinkingPart?: new (...args: unknown[]) => unknown;
  }).LanguageModelThinkingPart;
  return typeof ctor === "function" && part instanceof ctor;
}

function normalizeThinkingPartText(value: string | string[]): string {
  return Array.isArray(value) ? value.join("") : value;
}

function dataUrl(mimeType: string, data: Uint8Array): string {
  return `data:${mimeType};base64,${Buffer.from(data).toString("base64")}`;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return String(value);
  }
}

export type {
  LanguageModelChatMessage,
  LanguageModelChatMessageRole,
  LanguageModelChatRequestMessage,
} from "vscode";
