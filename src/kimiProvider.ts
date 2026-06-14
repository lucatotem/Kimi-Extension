// src/kimiProvider.ts
// VS Code LanguageModelChatProvider implementation for Kimi/Moonshot models.
//
// Responsibilities:
//  1. Fetch models from Kimi's /v1/models endpoint on demand.
//  2. Generate presets via the local capability registry.
//  3. Expose models via provideLanguageModelChatInformation.
//  4. Handle chat requests via provideLanguageModelChatResponse.
//  5. Provide token counts via provideTokenCount.

import * as vscode from "vscode";
import { fetchKimiModels } from "./modelDiscovery";
import { presetsForKimiModel } from "./presets";
import { convertMessages } from "./messageConverter";
import { streamChatCompletion } from "./kimiClient";
import { estimateTokenCount } from "./tokenCounter";
import type { KimiPreset } from "./types";

const SECRET_KEY = "kimiCopilot.apiKey";

export class KimiChatProvider implements vscode.LanguageModelChatProvider {
  /** Cached list of presets. Cleared on API key change or forced refresh. */
  private presets: KimiPreset[] | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {}

  // ── Public API ──────────────────────────────────────────────────────

  /** Invalidate the preset cache so the next request re-discovers models. */
  clearCache(): void {
    this.presets = undefined;
  }

  /** Eagerly load presets (used by the "Refresh Models" command). */
  async warmup(): Promise<void> {
    await this.loadPresets(false);
  }

  // ── LanguageModelChatProvider implementation ────────────────────────

  /**
   * Provide model metadata so VS Code can populate the model picker.
   *
   * Called by VS Code when the user opens the chat model picker.
   * If `options.silent` is true, avoid showing error dialogs.
   */
  async provideLanguageModelChatInformation(
    options: { silent?: boolean },
    _token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelChatInformation[]> {
    const presets = await this.loadPresets(options.silent ?? false);

    return presets.map((preset) => {
      const ctxLength = preset.contextLength ?? 256000; // fallback for Kimi models
      return {
        id: preset.presetId,
        name: preset.displayName,
        family: "kimi",
        version: "1",
        maxInputTokens: Math.max(0, ctxLength - preset.maxOutputTokens),
        maxOutputTokens: preset.maxOutputTokens,
        tooltip: preset.tooltip,
        detail: `Model: ${preset.modelId}`,
        capabilities: {
          imageInput: false,
          toolCalling: true,
        },
      } satisfies vscode.LanguageModelChatInformation;
    });
  }

  /**
   * Handle a chat request from VS Code.
   *
   * Converts VS Code messages → Kimi format, streams the response,
   * and reports results via the progress callback.
   */
  async provideLanguageModelChatResponse(
    model: vscode.LanguageModelChatInformation,
    messages: readonly vscode.LanguageModelChatRequestMessage[],
    _options: vscode.ProvideLanguageModelChatResponseOptions,
    progress: vscode.Progress<vscode.LanguageModelTextPart>,
    token: vscode.CancellationToken,
  ): Promise<void> {
    const apiKey = await this.getApiKey({ silent: false });
    if (!apiKey) {
      throw new Error("Missing Kimi API key. Run Kimi: Set API Key to configure.");
    }

    const preset = (await this.loadPresets(false)).find(
      (p) => p.presetId === model.id,
    );
    if (!preset) {
      throw new Error(`Unknown Kimi preset: ${model.id}. Try running Kimi: Refresh Models.`);
    }

    const config = vscode.workspace.getConfiguration("kimiCopilot");
    const baseUrl = config.get<string>("baseUrl", "https://api.moonshot.ai/v1");
    const showReasoning = config.get<boolean>("showReasoning", false);

    const kimiMessages = convertMessages(messages);

    // Build request body by merging preset defaults with runtime params
    const requestBody: Record<string, unknown> = {
      ...preset.requestBody,
      messages: kimiMessages,
    };

    // Create an AbortController wired to VS Code's cancellation token
    const abortController = new AbortController();
    const disposable = token.onCancellationRequested(() => abortController.abort());

    try {
      await streamChatCompletion(
        baseUrl,
        apiKey,
        requestBody,
        abortController.signal,
        {
          showReasoning,
          onText: (text) => {
            progress.report(new vscode.LanguageModelTextPart(text));
          },
        },
      );
    } finally {
      disposable.dispose();
    }
  }

  /**
   * Estimate token count for a given text or message.
   *
   * Used by VS Code to check context-window limits before sending requests.
   */
  async provideTokenCount(
    model: vscode.LanguageModelChatInformation,
    input: string | vscode.LanguageModelChatRequestMessage,
    _token: vscode.CancellationToken,
  ): Promise<number> {
    const result = estimateTokenCount(input);
    return result.tokens;
  }

  // ── Internal helpers ────────────────────────────────────────────────

  /**
   * Load presets, fetching models from the API if the cache is empty.
   *
   * @param silent  If true, suppress error dialogs (e.g. when VS Code
   *                probes providers in the background).
   */
  private async loadPresets(silent: boolean): Promise<KimiPreset[]> {
    if (this.presets) {
      return this.presets;
    }

    const apiKey = await this.getApiKey({ silent });
    if (!apiKey) {
      return [];
    }

    const config = vscode.workspace.getConfiguration("kimiCopilot");
    const baseUrl = config.get<string>("baseUrl", "https://api.moonshot.ai/v1");

    try {
      const models = await fetchKimiModels(baseUrl, apiKey);

      this.presets = models
        .flatMap((m) => presetsForKimiModel(m))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));

      return this.presets;
    } catch (err) {
      if (!silent) {
        vscode.window.showErrorMessage(
          `Kimi model discovery failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      return [];
    }
  }

  /**
   * Retrieve the stored API key, optionally prompting the user.
   *
   * @param options.silent  If true, return undefined without prompting.
   */
  private async getApiKey(options?: { silent?: boolean }): Promise<string | undefined> {
    const key = await this.context.secrets.get(SECRET_KEY);
    if (key) {
      return key;
    }

    if (options?.silent) {
      return undefined;
    }

    // Trigger the set-API-key flow
    await vscode.commands.executeCommand("kimiCopilot.setApiKey");
    return this.context.secrets.get(SECRET_KEY);
  }
}
