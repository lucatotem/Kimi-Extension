// src/presets.ts
// Model registry and discovery merge logic for Kimi Copilot.
// Verified 2026-10-26: https://platform.kimi.ai/docs/models
// https://www.kimi.com/code/docs/en/kimi-code/models.html

import type { KimiModel, KimiPreset } from "./types";
import { KIMI_CODE_MODEL_ID } from "./endpoints";

const K = 1024;
const KIMI_CONTEXT = 256 * K;
const KIMI_K3_CONTEXT = 1024 * K;
const TOOL_LIMIT = 128;

export type KimiModelCatalog = "platform" | "kimiCode" | "custom";

export const KNOWN_KIMI_MODELS: KimiPreset[] = [
  k31Model("kimi-k3.1-pro", "Kimi K3.1 Pro", "platform"),
  k31Model("kimi-k3.1-pro-highspeed", "Kimi K3.1 Pro Highspeed", "platform"),
  {
    presetId: "kimi-k3",
    displayName: "Kimi K3",
    modelId: "kimi-k3",
    family: "kimi",
    version: "k3",
    detail: "Previous flagship with 1M context and vision",
    tooltip: "Kimi K3 for software engineering, knowledge work, deep reasoning, and visual understanding. K3.1 Pro is the latest flagship.",
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
    detail: "Retiring December 2026: always-thinking code model",
    tooltip: "Kimi K2.7 Code always uses thinking and preserved thinking. Platform retirement is planned for the end of December 2026; migrate to K3.1 Pro.",
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
    detail: "Retiring December 2026: high-speed code model",
    tooltip: "High-speed Kimi K2.7 Code for coding and agent tasks. Platform retirement is planned for the end of December 2026; migrate to K3.1 Pro Highspeed.",
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
    detail: "Retiring December 2026: thinking and vision",
    tooltip: "Kimi K2.6 for coding, agent tasks, text, image, and video input. Platform retirement is planned for the end of December 2026; migrate to K3.1 Pro.",
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
];

export const KIMI_CODE_MODELS: KimiPreset[] = [
  k31Model("k3.1-pro", "Kimi K3.1 Pro", "kimiCode"),
  k31Model("k3.1-pro-highspeed", "Kimi K3.1 Pro Highspeed", "kimiCode"),
  {
    presetId: "k3",
    displayName: "Kimi K3",
    modelId: "k3",
    family: "kimi",
    version: "k3-code",
    detail: "Kimi Code K3 with up to 1M context",
    tooltip: "Kimi K3 through the Kimi Code plan. Requires Plus / Moderato or above; 1M context requires Pro / Allegretto or above. Disabling thinking routes to K2.8 Preview.",
    contextLength: KIMI_K3_CONTEXT,
    maxInputTokens: KIMI_K3_CONTEXT,
    maxOutputTokens: KIMI_K3_CONTEXT,
    capabilities: {
      toolCalling: TOOL_LIMIT,
      imageInput: true,
      thinking: true,
      canDisableThinking: true,
      supportsPreservedThinking: true,
      supportsReasoningEffort: true,
      alwaysThinking: false,
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
    tooltip: "Kimi K3 256K through the Kimi Code plan. Requires Plus / Moderato or above and does not support video input. Disabling thinking routes to K2.8 Preview.",
    contextLength: KIMI_CONTEXT,
    maxInputTokens: KIMI_CONTEXT,
    maxOutputTokens: KIMI_CONTEXT,
    capabilities: {
      toolCalling: TOOL_LIMIT,
      imageInput: true,
      thinking: true,
      canDisableThinking: true,
      supportsPreservedThinking: true,
      supportsReasoningEffort: true,
      alwaysThinking: false,
      defaultReasoningEffort: "high",
    },
  },
  {
    presetId: KIMI_CODE_MODEL_ID,
    displayName: "Kimi K2.8 Preview",
    modelId: KIMI_CODE_MODEL_ID,
    family: "kimi",
    version: "k2.8-preview-code-plan",
    detail: "Kimi Code K2.8 Preview with 1M context",
    tooltip: "The kimi-for-coding alias now serves K2.8 Preview with low, high, or max reasoning effort. Requires Plus or above on new plans, or Andante or above on legacy plans.",
    contextLength: KIMI_K3_CONTEXT,
    maxInputTokens: KIMI_K3_CONTEXT,
    maxOutputTokens: 32 * K,
    capabilities: {
      toolCalling: TOOL_LIMIT,
      imageInput: true,
      thinking: true,
      canDisableThinking: true,
      supportsPreservedThinking: true,
      supportsReasoningEffort: true,
      alwaysThinking: false,
      defaultReasoningEffort: "max",
    },
  },
  {
    presetId: "kimi-for-coding-highspeed",
    displayName: "Kimi K2.7 Code High-Speed",
    modelId: "kimi-for-coding-highspeed",
    family: "kimi",
    version: "k2.7-code-highspeed-plan",
    detail: "Kimi Code high-speed model",
    tooltip: "High-speed Kimi K2.7 Code through the Kimi Code plan. Requires Pro / Allegretto or above. Disabling thinking routes to K2.8 Preview.",
    contextLength: KIMI_CONTEXT,
    maxInputTokens: KIMI_CONTEXT,
    maxOutputTokens: 32 * K,
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
];

export function mergeDiscoveredModels(
  discovered: KimiModel[] | undefined,
  catalog: KimiModelCatalog,
): KimiPreset[] {
  const bundled = bundledModels(catalog);
  const byId = new Map(bundled.map((model) => [model.modelId, model]));

  for (const model of discovered ?? []) {
    if (
      typeof model?.id !== "string" || !model.id.trim() ||
      (catalog !== "custom" && isDeprecatedModel(model.id))
    ) {
      continue;
    }

    const known = byId.get(model.id);
    if (known) {
      const contextLength = validContextLength(model.context_length, known.contextLength);
      byId.set(model.id, {
        ...known,
        contextLength,
        maxInputTokens: contextLength,
        maxOutputTokens: Math.min(known.maxOutputTokens, contextLength),
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

function k31Model(id: string, name: string, catalog: KimiModelCatalog): KimiPreset {
  const highspeed = id.endsWith("-highspeed");
  return {
    presetId: id,
    displayName: name,
    modelId: id,
    family: "kimi",
    version: id.replace(/^kimi-/, ""),
    detail: highspeed ? "High-speed flagship with 1M context and vision" : "Latest flagship with 1M context and vision",
    tooltip: catalog === "platform"
      ? `${name} with 1M context, vision, tools, and always-on reasoning.`
      : `${name} through Kimi Code. ${highspeed ? "Requires Pro / Allegretto or above." : "Requires Plus / Moderato or above; 1M context requires Pro / Allegretto or above."} Thinking cannot be disabled.`,
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
      defaultReasoningEffort: catalog === "platform" ? "max" : "high",
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
  const contextLength = validContextLength(model.context_length, KIMI_CONTEXT);
  const isK3 = /^(?:kimi-)?k3(?:$|[.-])/i.test(id);
  const isK31 = /^(?:kimi-)?k3\.1(?:$|-)/i.test(id);
  const isK27Code = /k2\.7-code|kimi-for-coding-highspeed/i.test(id);
  const isK28 = id === KIMI_CODE_MODEL_ID;
  const reasoning = model.supports_reasoning ?? /k[23]|thinking|reason/i.test(id);
  const imageInput = (model.supports_image_in ?? /vision|k2\.[5-9]|k3/i.test(id)) || model.supports_video_in === true;
  const canDisableThinking = reasoning && !isK31 && (catalog === "kimiCode" || (!isK3 && !isK27Code));

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
      canDisableThinking,
      supportsPreservedThinking: reasoning && (/k2\.6|k2\.7-code/i.test(id) || isK3 || isK28),
      supportsReasoningEffort: reasoning && (isK3 || isK28),
      alwaysThinking: reasoning && !canDisableThinking,
      defaultReasoningEffort: reasoning && (isK3 || isK28)
        ? (catalog === "platform" || isK28 ? "max" : "high") : undefined,
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

function validContextLength(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function isDeprecatedModel(id: string): boolean {
  return (
    id === "kimi-latest" ||
    id === "kimi-thinking-preview" ||
    id === "kimi-k2" ||
    id.startsWith("kimi-k2-") ||
    id === "kimi-k2.5" ||
    id.startsWith("moonshot-v1-")
  );
}

function sortRank(model: KimiPreset): number {
  const order = [
    "kimi-k3.1-pro",
    "k3.1-pro",
    "kimi-k3.1-pro-highspeed",
    "k3.1-pro-highspeed",
    "kimi-k3",
    "k3",
    "k3-256k",
    "kimi-k2.7-code",
    KIMI_CODE_MODEL_ID,
    "kimi-k2.7-code-highspeed",
    "kimi-for-coding-highspeed",
    "kimi-k2.6",
  ];
  const index = order.indexOf(model.modelId);
  return index === -1 ? order.length : index;
}
