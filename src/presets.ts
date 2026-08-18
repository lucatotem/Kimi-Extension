// src/presets.ts
// Model registry and discovery merge logic for Kimi Copilot.

import type { KimiModel, KimiPreset } from "./types";
import { KIMI_CODE_MODEL_ID } from "./endpoints";

const K = 1024;
const KIMI_CONTEXT = 256 * K;
const KIMI_K3_CONTEXT = 1024 * K;
const MOONSHOT_8K = 8 * K;
const MOONSHOT_32K = 32 * K;
const MOONSHOT_128K = 128 * K;
const TOOL_LIMIT = 128;

export type KimiModelCatalog = "platform" | "kimiCode" | "custom";

export const KNOWN_KIMI_MODELS: KimiPreset[] = [
  {
    presetId: "kimi-k3",
    displayName: "Kimi K3",
    modelId: "kimi-k3",
    family: "kimi",
    version: "k3",
    detail: "Flagship model with 1M context and vision",
    tooltip: "Kimi's flagship model for software engineering, knowledge work, deep reasoning, and visual understanding.",
    contextLength: KIMI_K3_CONTEXT,
    maxInputTokens: KIMI_K3_CONTEXT,
    maxOutputTokens: KIMI_K3_CONTEXT,
    capabilities: {
      toolCalling: TOOL_LIMIT,
      imageInput: true,
      thinking: true,
      canDisableThinking: false,
      supportsPreservedThinking: true,
      supportsReasoningEffort: true,
      alwaysThinking: true,
      defaultReasoningEffort: "max",
    },
  },
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
      supportsReasoningEffort: false,
      alwaysThinking: true,
    },
  },
  {
    presetId: "kimi-k2.7-code-highspeed",
    displayName: "Kimi K2.7 Code High-Speed",
    modelId: "kimi-k2.7-code-highspeed",
    family: "kimi",
    version: "k2.7-code-highspeed",
    detail: "High-speed code model, always-thinking",
    tooltip: "High-speed Kimi K2.7 Code variant for coding and agent tasks.",
    contextLength: KIMI_CONTEXT,
    maxInputTokens: KIMI_CONTEXT,
    maxOutputTokens: KIMI_CONTEXT,
    capabilities: {
      toolCalling: TOOL_LIMIT,
      imageInput: true,
      thinking: true,
      canDisableThinking: false,
      supportsPreservedThinking: true,
      supportsReasoningEffort: false,
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
      supportsReasoningEffort: false,
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
      supportsReasoningEffort: false,
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

export const KIMI_CODE_MODELS: KimiPreset[] = [
  {
    presetId: "k3",
    displayName: "Kimi K3",
    modelId: "k3",
    family: "kimi",
    version: "k3-code",
    detail: "Kimi Code K3 with up to 1M context",
    tooltip: "Kimi K3 through the Kimi Code plan. Requires Moderato or above; 1M context requires Allegretto or above.",
    contextLength: KIMI_K3_CONTEXT,
    maxInputTokens: KIMI_K3_CONTEXT,
    maxOutputTokens: KIMI_K3_CONTEXT,
    capabilities: {
      toolCalling: TOOL_LIMIT,
      imageInput: true,
      thinking: true,
      canDisableThinking: false,
      supportsPreservedThinking: true,
      supportsReasoningEffort: true,
      alwaysThinking: true,
      defaultReasoningEffort: "high",
    },
  },
  {
    presetId: "k3-256k",
    displayName: "Kimi K3 256K",
    modelId: "k3-256k",
    family: "kimi",
    version: "k3-256k-code",
    detail: "Kimi Code K3 with a fixed 256K context",
    tooltip: "Kimi K3 256K through the Kimi Code plan. Requires Moderato or above and does not support video input.",
    contextLength: KIMI_CONTEXT,
    maxInputTokens: KIMI_CONTEXT,
    maxOutputTokens: KIMI_CONTEXT,
    capabilities: {
      toolCalling: TOOL_LIMIT,
      imageInput: true,
      thinking: true,
      canDisableThinking: false,
      supportsPreservedThinking: true,
      supportsReasoningEffort: true,
      alwaysThinking: true,
      defaultReasoningEffort: "high",
    },
  },
  {
    presetId: KIMI_CODE_MODEL_ID,
    displayName: "Kimi K2.7 Code",
    modelId: KIMI_CODE_MODEL_ID,
    family: "kimi",
    version: "k2.7-code-plan",
    detail: "Kimi Code standard-speed model",
    tooltip: "Kimi K2.7 Code through the Kimi Code plan. Available to all membership tiers.",
    contextLength: KIMI_CONTEXT,
    maxInputTokens: KIMI_CONTEXT,
    maxOutputTokens: 32 * K,
    capabilities: {
      toolCalling: TOOL_LIMIT,
      imageInput: true,
      thinking: true,
      canDisableThinking: false,
      supportsPreservedThinking: true,
      supportsReasoningEffort: false,
      alwaysThinking: true,
    },
  },
  {
    presetId: "kimi-for-coding-highspeed",
    displayName: "Kimi K2.7 Code High-Speed",
    modelId: "kimi-for-coding-highspeed",
    family: "kimi",
    version: "k2.7-code-highspeed-plan",
    detail: "Kimi Code high-speed model",
    tooltip: "High-speed Kimi K2.7 Code through the Kimi Code plan. Requires Allegretto or above.",
    contextLength: KIMI_CONTEXT,
    maxInputTokens: KIMI_CONTEXT,
    maxOutputTokens: 32 * K,
    capabilities: {
      toolCalling: TOOL_LIMIT,
      imageInput: true,
      thinking: true,
      canDisableThinking: false,
      supportsPreservedThinking: true,
      supportsReasoningEffort: false,
      alwaysThinking: true,
    },
  },
];

export function mergeDiscoveredModels(
  discovered: KimiModel[] | undefined,
  catalog: KimiModelCatalog,
): KimiPreset[] {
  const bundled = bundledModels(catalog);
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
      });
      continue;
    }

    byId.set(model.id, presetFromUnknownModel(model, catalog));
  }

  return Array.from(byId.values()).sort((a, b) => sortRank(a) - sortRank(b) || a.displayName.localeCompare(b.displayName));
}

export function getKnownModelIdOverrides(): Record<string, string> {
  return Object.fromEntries(
    [...KNOWN_KIMI_MODELS, ...KIMI_CODE_MODELS].map((model) => [model.presetId, model.modelId]),
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
      supportsReasoningEffort: false,
      alwaysThinking: false,
    },
  };
}

function bundledModels(catalog: KimiModelCatalog): KimiPreset[] {
  if (catalog === "platform") {
    return KNOWN_KIMI_MODELS;
  }
  if (catalog === "kimiCode") {
    return KIMI_CODE_MODELS;
  }
  return [...KNOWN_KIMI_MODELS, ...KIMI_CODE_MODELS];
}

function presetFromUnknownModel(model: KimiModel, catalog: KimiModelCatalog): KimiPreset {
  const id = model.id;
  const contextLength = model.context_length ?? KIMI_CONTEXT;
  const isK3 = /^(?:kimi-)?k3(?:$|-)/i.test(id);
  const isK27Code = /k2\.7-code|kimi-for-coding/i.test(id);
  const reasoning = Boolean(model.supports_reasoning) || /k[23]|thinking|reason/i.test(id);
  const imageInput = Boolean(model.supports_image_in || model.supports_video_in || /vision|k[23]/i.test(id));

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
      canDisableThinking: reasoning && !isK27Code && !isK3,
      supportsPreservedThinking: /k2\.6|k2\.7-code/i.test(id) || isK3,
      supportsReasoningEffort: isK3,
      alwaysThinking: isK27Code || isK3,
      defaultReasoningEffort: isK3 ? (catalog === "platform" ? "max" : "high") : undefined,
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
    "kimi-k3",
    "k3",
    "k3-256k",
    "kimi-k2.7-code",
    KIMI_CODE_MODEL_ID,
    "kimi-k2.7-code-highspeed",
    "kimi-for-coding-highspeed",
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
