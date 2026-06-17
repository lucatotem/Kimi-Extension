// src/kimiClient.ts
// Low-level HTTP client for Kimi's OpenAI-compatible chat completions API.

import type {
  KimiChatRequest,
  KimiToolCall,
  KimiToolCallDelta,
  KimiUsage,
  StreamHandlerOptions,
} from "./types";
import { formatFetchFailure } from "./httpDiagnostics";

export async function streamChatCompletion(
  baseUrl: string,
  apiKey: string,
  body: KimiChatRequest,
  signal: AbortSignal,
  handlers: StreamHandlerOptions,
): Promise<void> {
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    throw new Error(formatFetchFailure(error, url, "Kimi chat request"));
  }

  if (!response.ok || !response.body) {
    const errorText = await response.text().catch(() => "<unreadable>");
    throw new Error(
      `Kimi chat request failed: ${response.status} ${response.statusText} ${errorText}`,
    );
  }

  await parseSSEStream(response.body, handlers);
}

async function parseSSEStream(
  body: ReadableStream<Uint8Array>,
  handlers: StreamHandlerOptions,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const pendingToolCalls = new Map<number, KimiToolCall>();
  let buffer = "";
  let latestUsage: KimiUsage | undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) {
          continue;
        }

        if (trimmed === "data: [DONE]") {
          flushToolCalls(pendingToolCalls, handlers);
          reportUsage(latestUsage, handlers);
          return;
        }

        if (!trimmed.startsWith("data: ")) {
          continue;
        }

        const jsonText = trimmed.slice("data: ".length);
        try {
          const chunk = JSON.parse(jsonText);
          if (chunk.usage) {
            latestUsage = chunk.usage;
          }

          const choice = chunk.choices?.[0];
          const delta = choice?.delta;
          if (!delta) {
            continue;
          }

          if (delta.reasoning_content) {
            handlers.onThinking(delta.reasoning_content);
          }

          if (delta.content) {
            handlers.onContent(delta.content);
          }

          if (delta.tool_calls) {
            for (const toolCallDelta of delta.tool_calls as KimiToolCallDelta[]) {
              applyToolCallDelta(pendingToolCalls, toolCallDelta);
            }
          }

          if (choice.finish_reason === "tool_calls" || choice.finish_reason === "stop") {
            flushToolCalls(pendingToolCalls, handlers);
          }
        } catch {
          // Ignore malformed fragments. The next SSE line normally completes the stream.
        }
      }
    }

    flushToolCalls(pendingToolCalls, handlers);
    reportUsage(latestUsage, handlers);
  } finally {
    reader.releaseLock();
  }
}

function applyToolCallDelta(
  pendingToolCalls: Map<number, KimiToolCall>,
  delta: KimiToolCallDelta,
): void {
  const index = delta.index ?? 0;
  let pending = pendingToolCalls.get(index);

  if (!pending) {
    pending = {
      id: delta.id ?? `tool_call_${index}`,
      type: "function",
      function: {
        name: "",
        arguments: "",
      },
    };
    pendingToolCalls.set(index, pending);
  }

  if (delta.id) {
    pending.id = delta.id;
  }
  if (delta.type) {
    pending.type = delta.type;
  }
  if (delta.function?.name) {
    pending.function.name += delta.function.name;
  }
  if (delta.function?.arguments) {
    pending.function.arguments += delta.function.arguments;
  }
}

function flushToolCalls(
  pendingToolCalls: Map<number, KimiToolCall>,
  handlers: StreamHandlerOptions,
): void {
  if (!handlers.onToolCall) {
    pendingToolCalls.clear();
    return;
  }

  for (const call of pendingToolCalls.values()) {
    if (call.function.name) {
      handlers.onToolCall(call);
    }
  }
  pendingToolCalls.clear();
}

function reportUsage(usage: KimiUsage | undefined, handlers: StreamHandlerOptions): void {
  if (usage && handlers.onUsage) {
    handlers.onUsage(usage);
  }
}
