// src/presets.ts
// Generates Kimi model presets based on discovered model metadata and
// documented capabilities. This is the local capability registry (Layer 2).

import type { KimiModel, KimiPreset } from "./types";

/**
 * Determine the correct presets for a Kimi model discovered via /v1/models.
 *
 * Two-layer approach:
 *   Layer 1 – discovered models from /v1/models
 *   Layer 2 – this local capability registry for known model families
 *
 * Unknown models receive a generic fallback so they still appear in the picker.
 */
export function presetsForKimiModel(model: KimiModel): KimiPreset[] {
  const id = model.id;
  const ctxLength = model.context_length;

  // ── kimi-k2.7-code ────────────────────────────────────────────────
  // Docs: thinking is always on; Preserved Thinking is always on.
  // Do NOT pass the `thinking` parameter. Temperature is not modifiable.
  if (isK27CodeFamily(id)) {
    return buildPresets(id, ctxLength, [
      { suffix: "code-32k", label: "Kimi K2.7 Code — 32k", maxTokens: 32768, extra: {} },
      { suffix: "code-64k", label: "Kimi K2.7 Code — 64k", maxTokens: 65536, extra: {} },
    ], {
      tooltip: "Code-focused Kimi model. Thinking is always on.",
      preserveReasoning: true,
    });
  }

  // ── kimi-k2.6 ─────────────────────────────────────────────────────
  // Docs: thinking is enabled by default; can be disabled via thinking.type.
  // Temperature is not modifiable. reasoning_content + content share max_tokens.
  if (isK26Family(id)) {
    return buildPresets(id, ctxLength, [
      {
        suffix: "thinking-32k",
        label: "Kimi K2.6 — Thinking 32k",
        maxTokens: 32768,
        extra: { thinking: { type: "enabled" } },
      },
      {
        suffix: "instant-16k",
        label: "Kimi K2.6 — Instant 16k",
        maxTokens: 16384,
        extra: { thinking: { type: "disabled" } },
      },
      {
        suffix: "thinking-keep-32k",
        label: "Kimi K2.6 — Thinking Keep 32k",
        maxTokens: 32768,
        extra: { thinking: { type: "enabled", keep: "all" } },
      },
    ], {
      tooltip: "General-purpose thinking model for complex coding and reasoning.",
      preserveReasoning: false, // overridden per-preset below
    });
  }

  // ── Generic reasoning-capable models ──────────────────────────────
  if (model.supports_reasoning) {
    return buildPresets(id, ctxLength, [
      {
        suffix: "thinking-32k",
        label: `${modelLabel(id)} — Thinking 32k`,
        maxTokens: 32768,
        extra: { thinking: { type: "enabled" } },
      },
      {
        suffix: "instant-16k",
        label: `${modelLabel(id)} — Instant 16k`,
        maxTokens: 16384,
        extra: { thinking: { type: "disabled" } },
      },
    ], {
      tooltip: "Auto-generated thinking preset from model discovery.",
      preserveReasoning: false,
    });
  }

  // ── Default fallback ──────────────────────────────────────────────
  if (getEnableExperimentalPresets()) {
    return [
      {
        presetId: `${id}:default`,
        displayName: `${modelLabel(id)} — Default 16k`,
        modelId: id,
        maxOutputTokens: 16384,
        requestBody: { model: id, max_tokens: 16384 },
        tooltip: "Default Kimi preset generated from model discovery.",
        preserveReasoning: false,
        contextLength: ctxLength,
      },
    ];
  }

  return [];
}

// ── Helpers ───────────────────────────────────────────────────────────

/** Build a list of presets from a template. */
function buildPresets(
  modelId: string,
  contextLength: number | undefined,
  variants: { suffix: string; label: string; maxTokens: number; extra: Record<string, unknown> }[],
  defaults: { tooltip: string; preserveReasoning: boolean },
): KimiPreset[] {
  const overrideMap: Record<string, Partial<KimiPreset>> = {
    "thinking-keep-32k": { preserveReasoning: true, tooltip: "Preserves reasoning across turns for longer agentic tasks." },
    "instant-16k": { tooltip: "No-thinking preset for quick edits and faster responses." },
    "thinking-32k": { tooltip: "General-purpose thinking mode for complex coding and reasoning." },
    "code-32k": { tooltip: "Code-focused Kimi model. Thinking is always on." },
    "code-64k": { tooltip: "Longer output preset for large coding tasks." },
  };

  return variants.map((v) => ({
    presetId: `${modelId}:${v.suffix}`,
    displayName: v.label,
    modelId,
    maxOutputTokens: v.maxTokens,
    requestBody: { model: modelId, max_tokens: v.maxTokens, ...v.extra },
    tooltip: overrideMap[v.suffix]?.tooltip ?? defaults.tooltip,
    preserveReasoning: overrideMap[v.suffix]?.preserveReasoning ?? defaults.preserveReasoning,
    contextLength,
  }));
}

/** Check if the model ID belongs to the k2.7-code family. */
function isK27CodeFamily(id: string): boolean {
  return id.includes("k2.7-code") || id.includes("k2.7_code") || id.startsWith("kimi-k2.7-code");
}

/** Check if the model ID belongs to the k2.6 family. */
function isK26Family(id: string): boolean {
  return id.includes("k2.6") || id.startsWith("kimi-k2.6");
}

/** Derive a short human label from a model ID. */
function modelLabel(id: string): string {
  // Strip vendor prefix if present
  return id.replace(/^(kimi-|moonshot-)/i, "");
}

/** Read the enableExperimentalPresets setting. */
function getEnableExperimentalPresets(): boolean {
  try {
    // Dynamic import to avoid runtime dependency on vscode in tests
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const vscode = require("vscode");
    const config = vscode.workspace.getConfiguration("kimiCopilot");
    return config.get("enableExperimentalPresets", true) as boolean;
  } catch {
    return true;
  }
}
