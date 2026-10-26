// Thinking controls and API request parameters shared by all model catalogs.

import type * as vscode from "vscode";
import type { KimiChatRequest, KimiPreset } from "./types";

export type ReasoningEffort = "none" | "low" | "high" | "max";

export function buildThinkingSchema(preset: KimiPreset): object {
  const canDisable = preset.capabilities.canDisableThinking;
  const values = preset.capabilities.supportsReasoningEffort
    ? [...(canDisable ? ["none"] : []), "low", "high", "max"]
    : canDisable
      ? ["none", "high", "max"]
      : ["high", "max"];

  return {
    properties: {
      reasoningEffort: {
        type: "string",
        title: "Thinking",
        enum: values,
        enumItemLabels: values.map((value) => labelForThinkingEffort(value as ReasoningEffort)),
        enumDescriptions: values.map((value) =>
          descriptionForThinkingEffort(value as ReasoningEffort, preset),
        ),
        default: preset.capabilities.defaultReasoningEffort ?? "high",
        group: "navigation",
      },
    },
  };
}

function labelForThinkingEffort(value: ReasoningEffort): string {
  if (value === "none") {
    return "None";
  }
  if (value === "max") {
    return "Max";
  }
  if (value === "low") {
    return "Low";
  }
  return "High";
}

function descriptionForThinkingEffort(value: ReasoningEffort, preset: KimiPreset): string {
  if (value === "none") {
    if (preset.modelId === "k3" || preset.modelId === "k3-256k" ||
      preset.modelId === "kimi-for-coding-highspeed") {
      return "Disable thinking and route this Kimi Code request to K2.8 Preview.";
    }
    return "Disable Kimi thinking for faster replies when the model supports it.";
  }
  if (preset.capabilities.supportsReasoningEffort) {
    return `Use Kimi's ${value} reasoning effort for this request.`;
  }
  if (value === "max" && preset.capabilities.supportsPreservedThinking) {
    return "Enable thinking and keep previous reasoning content across turns.";
  }
  if (value === "max") {
    return "Enable thinking. This model does not support preserved thinking.";
  }
  return "Enable Kimi thinking for the current request.";
}

export function getConfiguredThinkingEffort(
  options: vscode.ProvideLanguageModelChatResponseOptions,
  preset: KimiPreset,
): ReasoningEffort {
  const rawOptions = options as {
    modelConfiguration?: { reasoningEffort?: unknown };
    configuration?: { reasoningEffort?: unknown };
  };
  const configured =
    rawOptions.modelConfiguration?.reasoningEffort ?? rawOptions.configuration?.reasoningEffort;

  if (configured === "none" && preset.capabilities.canDisableThinking) {
    return "none";
  }
  if (configured === "low" && preset.capabilities.supportsReasoningEffort) {
    return "low";
  }
  if (configured === "high") {
    return "high";
  }
  if (configured === "max") {
    return "max";
  }
  return preset.capabilities.defaultReasoningEffort ?? "high";
}

export function applyThinkingConfig(
  request: KimiChatRequest,
  preset: KimiPreset,
  effort: ReasoningEffort,
): void {
  if (effort === "none" && preset.capabilities.canDisableThinking) {
    request.thinking = { type: "disabled" };
    return;
  }

  if (preset.capabilities.supportsReasoningEffort) {
    request.reasoning_effort = effort === "none"
      ? (preset.capabilities.defaultReasoningEffort ?? "high") : effort;
    return;
  }

  if (!preset.capabilities.thinking || preset.capabilities.alwaysThinking) {
    return;
  }

  request.thinking = { type: "enabled" };
  if (effort === "max" && preset.capabilities.supportsPreservedThinking) {
    request.thinking.keep = "all";
  }
}

