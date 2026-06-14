// src/types.ts
// Shared type definitions for the Kimi Copilot provider.

export type KimiRole = "system" | "user" | "assistant" | "tool";

export interface KimiTextContentPart {
  type: "text";
  text: string;
}

export interface KimiImageContentPart {
  type: "image_url";
  image_url: {
    url: string;
  };
}

export interface KimiVideoContentPart {
  type: "video_url";
  video_url: {
    url: string;
  };
}

export type KimiContentPart =
  | KimiTextContentPart
  | KimiImageContentPart
  | KimiVideoContentPart;

export type KimiMessageContent = string | KimiContentPart[];

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

export interface KimiCapabilities {
  toolCalling: boolean | number;
  imageInput: boolean;
  thinking: boolean;
  canDisableThinking: boolean;
  supportsPreservedThinking: boolean;
  alwaysThinking: boolean;
}

/** A model entry exposed to VS Code. */
export interface KimiPreset {
  presetId: string;
  displayName: string;
  modelId: string;
  version: string;
  family: string;
  detail: string;
  tooltip: string;
  contextLength: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  capabilities: KimiCapabilities;
}

/** SSE delta from a Kimi streaming response. */
export interface KimiStreamDelta {
  role?: string;
  content?: string;
  reasoning_content?: string;
  tool_calls?: KimiToolCallDelta[];
}

/** A complete tool call sent to or emitted from the Kimi API. */
export interface KimiToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

/** A single streaming tool-call delta from the API. */
export interface KimiToolCallDelta {
  index?: number;
  id?: string;
  type?: "function";
  function?: {
    name?: string;
    arguments?: string;
  };
}

export interface KimiToolDefinition {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: object;
  };
}

export interface KimiMessage {
  role: KimiRole;
  content: KimiMessageContent;
  name?: string;
  tool_call_id?: string;
  tool_calls?: KimiToolCall[];
  reasoning_content?: string;
}

export interface KimiUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_cache_hit_tokens?: number;
}

export interface KimiChatRequest {
  model: string;
  messages: KimiMessage[];
  stream: true;
  max_tokens?: number;
  tools?: KimiToolDefinition[];
  tool_choice?: "auto" | "none";
  thinking?: {
    type: "enabled" | "disabled";
    keep?: "all";
  };
}

/** Options passed to the SSE stream parser. */
export interface StreamHandlerOptions {
  onContent: (text: string) => void;
  onThinking: (text: string) => void;
  onToolCall?: (call: KimiToolCall) => void;
  onUsage?: (usage: KimiUsage) => void;
}

/** Result of fetching models from the Kimi API. */
export interface KimiModelsResponse {
  data?: KimiModel[];
}

/** Result of a token count estimation. */
export interface TokenCountResult {
  tokens: number;
  method: "approximation" | "api";
}
