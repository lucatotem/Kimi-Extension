// src/types.ts
// Shared type definitions for the Kimi Copilot Presets extension.

/** Raw model object returned by Kimi's GET /v1/models endpoint. */
export interface KimiModel {
  id: string;
  object: string;
  created?: number;
  owned_by?: string;
  context_length?: number;
  supports_image_in?: boolean;
  supports_video_in?: boolean;
  supports_reasoning?: boolean;
}

/** A fully-resolved preset combining model metadata with request parameters. */
export interface KimiPreset {
  /** Unique identifier exposed to VS Code as the model ID. */
  presetId: string;
  /** Human-readable name shown in the model picker. */
  displayName: string;
  /** The underlying Kimi model ID (e.g. "kimi-k2.6"). */
  modelId: string;
  /** Maximum output tokens for this preset. */
  maxOutputTokens: number;
  /** The request body merged into every chat completion call. */
  requestBody: Record<string, unknown>;
  /** Tooltip text shown in the picker. */
  tooltip: string;
  /** Whether reasoning_content must be preserved across turns. */
  preserveReasoning: boolean;
  /** The discovered context length from /v1/models, if available. */
  contextLength?: number;
}

/** SSE delta from a Kimi streaming response. */
export interface KimiStreamDelta {
  role?: string;
  content?: string;
  reasoning_content?: string;
  tool_calls?: KimiToolCall[];
}

/** A single tool-call delta from the stream. */
export interface KimiToolCall {
  index?: number;
  id?: string;
  type?: "function";
  function?: {
    name?: string;
    arguments?: string;
  };
}

/** Options passed to the SSE stream parser. */
export interface StreamHandlerOptions {
  /** Whether to surface reasoning_content in the output. */
  showReasoning: boolean;
  /** Called for each text fragment (content or reasoning). */
  onText: (text: string) => void;
  /** Optional callback when a complete tool call is assembled. */
  onToolCall?: (call: KimiToolCall) => void;
}

/** Simplified message format sent to the Kimi API. */
export interface KimiMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/** Result of fetching models from the Kimi API. */
export interface KimiModelsResponse {
  data?: KimiModel[];
}

/** Result of a token count estimation. */
export interface TokenCountResult {
  /** Estimated number of tokens. */
  tokens: number;
  /** How the estimate was derived. */
  method: "approximation" | "api";
}
