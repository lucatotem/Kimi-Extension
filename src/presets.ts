// src/presets.ts
// Model registry and discovery merge logic for Kimi Copilot.

import type { KimiModel, KimiPreset } from "./types";
import { KIMI_CODE_MODEL_ID } from "./endpoints";

const K = 1024;
const KIMI_CONTEXT = 256 * K;
const MOONSHOT_8K = 8 * K;
const MOONSHOT_32K = 32 * K;
const MOONSHOT_128K = 128 * K;
const TOOL_LIMIT = 128;

export const KIMI_CODE_PRESET: KimiPreset = {
  presetId: KIMI_CODE_MODEL_ID,
  displayName: "Kimi Code",
  modelId: KIMI_CODE_MODEL_ID,
  family: "kimi",
  version: "coding",
  detail: "Kimi Code plan model",
  tooltip: "Kimi Code subscription model for coding agents. Uses the Kimi Code API endpoint.",
  contextLength: KIMI_CONTEXT,
  maxInputTokens: KIMI_CONTEXT,
  maxOutputTokens: 32 * K,
  capabilities: {
    toolCalling: TOOL_LIMIT,
    imageInput: true,
    thinking: true,
    canDisableThinking: false,
    supportsPreservedThinking: true,
    alwaysThinking: true,
  },
};

export const KNOWN_KIMI_MODELS: KimiPreset[] = [
  {
    presetId: "kimi-k2.7-code",
    displayName: "Kimi K2.7 Code",
    modelId: "kimi-k2.7-code",
    family: "kimi",
    version: "k2.7-code",
    detail: "Code model, always-thinking",
    tooltip: "Kimi's current code-focused model. Thinking and preserved thinking are always on.",
    contextLength: KIMI_CONTEXT,
    maxInputTokens: KIMI_CONTEXT,
    maxOutputTokens: KIMI_CONTEXT,
    capabilities: {
      toolCalling: TOOL_LIMIT,
      imageInput: true,
      thinking: true,
      canDisableThinking: false,
      supportsPreservedThinking: true,
      alwaysThinking: true,
    },
  },
  {
    presetId: "kimi-k2.6",
    displayName: "Kimi K2.6",
    modelId: "kimi-k2.6",
    family: "kimi",
    version: "k2.6",
    detail: "General model with thinking and vision",
    tooltip: "Kimi's general-purpose model for coding, agent tasks, text, image, and video input.",
    contextLength: KIMI_CONTEXT,
    maxInputTokens: KIMI_CONTEXT,
    maxOutputTokens: KIMI_CONTEXT,
    capabilities: {
      toolCalling: TOOL_LIMIT,
      imageInput: true,
      thinking: true,
      canDisableThinking: true,
      supportsPreservedThinking: true,
      alwaysThinking: false,
    },
  },
  {
    presetId: "kimi-k2.5",
    displayName: "Kimi K2.5",
    modelId: "kimi-k2.5",
    family: "kimi",
    version: "k2.5",
    detail: "General model with thinking and vision",
    tooltip: "Previous Kimi K2 model with thinking support. Preserved thinking is not supported.",
    contextLength: KIMI_CONTEXT,
    maxInputTokens: KIMI_CONTEXT,
    maxOutputTokens: KIMI_CONTEXT,
    capabilities: {
      toolCalling: TOOL_LIMIT,
      imageInput: true,
      thinking: true,
      canDisableThinking: true,
      supportsPreservedThinking: false,
      alwaysThinking: false,
    },
  },
  moonshotModel("moonshot-v1-8k", "Moonshot V1 8K", MOONSHOT_8K, false),
  moonshotModel("moonshot-v1-32k", "Moonshot V1 32K", MOONSHOT_32K, false),
  moonshotModel("moonshot-v1-128k", "Moonshot V1 128K", MOONSHOT_128K, false),
  moonshotModel("moonshot-v1-8k-vision-preview", "Moonshot V1 8K Vision", MOONSHOT_8K, true),
  moonshotModel("moonshot-v1-32k-vision-preview", "Moonshot V1 32K Vision", MOONSHOT_32K, true),
  moonshotModel("moonshot-v1-128k-vision-preview", "Moonshot V1 128K Vision", MOONSHOT_128K, true),
];

export function mergeDiscoveredModels(
  discovered: KimiModel[] | undefined,
  options?: { kimiCode?: boolean },
): KimiPreset[] {
  const bundled = options?.kimiCode ? [KIMI_CODE_PRESET] : KNOWN_KIMI_MODELS;
  const byId = new Map(bundled.map((model) => [model.modelId, model]));

  for (const model of discovered ?? []) {
    if (!model.id || isDeprecatedModel(model.id)) {
      continue;
    }

    const known = byId.get(model.id);
    if (known) {
      byId.set(model.id, {
        ...known,
        contextLength: model.context_length ?? known.contextLength,
        maxInputTokens: model.context_length ?? known.maxInputTokens,
        maxOutputTokens: model.context_length ?? known.maxOutputTokens,
      });
      continue;
    }

    byId.set(model.id, presetFromUnknownModel(model));
  }

  return Array.from(byId.values()).sort((a, b) => sortRank(a) - sortRank(b) || a.displayName.localeCompare(b.displayName));
}

export function getKnownModelIdOverrides(): Record<string, string> {
  return Object.fromEntries(
    [KIMI_CODE_PRESET, ...KNOWN_KIMI_MODELS].map((model) => [model.presetId, model.modelId]),
  );
}

export function supportsThinking(preset: KimiPreset): boolean {
  return preset.capabilities.thinking;
}

function moonshotModel(id: string, name: string, contextLength: number, vision: boolean): KimiPreset {
  return {
    presetId: id,
    displayName: name,
    modelId: id,
    family: "moonshot",
    version: id.replace("moonshot-v1-", ""),
    detail: vision ? "Text generation with image input" : "Text generation",
    tooltip: vision
      ? "Moonshot V1 vision model. Use for image understanding and text output."
      : "Moonshot V1 text model. Use for straightforward generation tasks.",
    contextLength,
    maxInputTokens: contextLength,
    maxOutputTokens: contextLength,
    capabilities: {
      toolCalling: false,
      imageInput: vision,
      thinking: false,
      canDisableThinking: false,
      supportsPreservedThinking: false,
      alwaysThinking: false,
    },
  };
}

function presetFromUnknownModel(model: KimiModel): KimiPreset {
  const id = model.id;
  const contextLength = model.context_length ?? KIMI_CONTEXT;
  const reasoning = Boolean(model.supports_reasoning) || /k2|thinking|reason/i.test(id);
  const imageInput = Boolean(model.supports_image_in || model.supports_video_in || /vision|k2/i.test(id));

  return {
    presetId: id,
    displayName: modelLabel(id),
    modelId: id,
    family: id.startsWith("moonshot-") ? "moonshot" : "kimi",
    version: "1",
    detail: "Discovered from Kimi API",
    tooltip: "Model returned by Kimi's /v1/models endpoint.",
    contextLength,
    maxInputTokens: contextLength,
    maxOutputTokens: contextLength,
    capabilities: {
      toolCalling: reasoning ? TOOL_LIMIT : false,
      imageInput,
      thinking: reasoning,
      canDisableThinking: reasoning && !/k2\.7-code/i.test(id),
      supportsPreservedThinking: /k2\.6|k2\.7-code/i.test(id),
      alwaysThinking: /k2\.7-code/i.test(id),
    },
  };
}

function modelLabel(id: string): string {
  return id
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isDeprecatedModel(id: string): boolean {
  return (
    id === "kimi-latest" ||
    id === "kimi-thinking-preview" ||
    id.startsWith("kimi-k2-") ||
    id === "kimi-k2-thinking" ||
    id === "kimi-k2-thinking-turbo"
  );
}

function sortRank(model: KimiPreset): number {
  const order = [
    KIMI_CODE_MODEL_ID,
    "kimi-k2.7-code",
    "kimi-k2.6",
    "kimi-k2.5",
    "moonshot-v1-128k-vision-preview",
    "moonshot-v1-32k-vision-preview",
    "moonshot-v1-8k-vision-preview",
    "moonshot-v1-128k",
    "moonshot-v1-32k",
    "moonshot-v1-8k",
  ];
  const index = order.indexOf(model.modelId);
  return index === -1 ? order.length : index;
}
