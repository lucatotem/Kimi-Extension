// src/kimiProvider.ts
// VS Code LanguageModelChatProvider implementation for Kimi/Moonshot models.

import * as vscode from "vscode";
import {
  DEFAULT_BASE_URL,
  KIMI_CODE_BASE_URL,
  KIMI_CODE_MODEL_ID,
  isKimiCodeBaseUrl,
  normalizeBaseUrl,
} from "./endpoints";
import { formatFetchFailure } from "./httpDiagnostics";
import { fetchKimiModels } from "./modelDiscovery";
import { convertMessages, convertTools, countMessageChars } from "./messageConverter";
import { streamChatCompletion } from "./kimiClient";
import { estimateTokenCount } from "./tokenCounter";
import { getKnownModelIdOverrides, mergeDiscoveredModels, supportsThinking } from "./presets";
import type { KimiChatRequest, KimiPreset, KimiUsage } from "./types";

const CONFIG_SECTION = "kimi-copilot";
const LEGACY_CONFIG_SECTION = "kimiCopilot";
const SECRET_KEY = "kimi-copilot.apiKey";
const LEGACY_SECRET_KEY = "kimiCopilot.apiKey";
const KIMI_CODE_SECRET_KEY = "kimi-copilot.kimiCodeApiKey";
const USAGE_DATA_PART_MIME = "usage";
const TOOL_LIMIT = 128;
const API_KEY_ENV_NAMES = ["KIMI_API_KEY", "MOONSHOT_API_KEY"];
const KIMI_CODE_API_KEY_ENV_NAMES = ["KIMI_CODE_API_KEY"];

type ReasoningEffort = "none" | "high" | "max";
type ApiMode = "platform" | "kimiCode" | "custom";

export class KimiChatProvider implements vscode.LanguageModelChatProvider {
  private presets: KimiPreset[] | undefined;
  private readonly output = vscode.window.createOutputChannel("Kimi Copilot");
  private readonly onDidChangeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeLanguageModelChatInformation = this.onDidChangeEmitter.event;
  private charsPerToken = 4;

  constructor(private readonly context: vscode.ExtensionContext) {
    context.subscriptions.push(
      this.output,
      this.onDidChangeEmitter,
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (
          event.affectsConfiguration(CONFIG_SECTION) ||
          event.affectsConfiguration(LEGACY_CONFIG_SECTION)
        ) {
          this.clearCache();
        }
      }),
      context.secrets.onDidChange((event) => {
        if (
          event.key === SECRET_KEY ||
          event.key === LEGACY_SECRET_KEY ||
          event.key === KIMI_CODE_SECRET_KEY
        ) {
          this.clearCache();
        }
      }),
    );
  }

  clearCache(): void {
    this.presets = undefined;
    this.onDidChangeEmitter.fire();
  }

  async warmup(): Promise<void> {
    await this.loadPresets(false);
  }

  async configureApiKey(): Promise<void> {
    const key = await vscode.window.showInputBox({
      title: "Set Kimi API Key",
      prompt: "Enter your Moonshot/Kimi API key",
      placeHolder: "sk-...",
      password: true,
      ignoreFocusOut: true,
      validateInput: (value) => (value.trim() ? undefined : "API key cannot be empty."),
    });

    if (!key) {
      return;
    }

    await this.context.secrets.store(SECRET_KEY, key.trim());
    await this.context.secrets.delete(LEGACY_SECRET_KEY);
    this.clearCache();
    vscode.window.showInformationMessage("Kimi API key saved.");
  }

  async clearApiKey(): Promise<void> {
    await this.context.secrets.delete(SECRET_KEY);
    await this.context.secrets.delete(LEGACY_SECRET_KEY);
    this.clearCache();
    vscode.window.showInformationMessage("Kimi API key removed.");
  }

  async configureKimiCodeApiKey(): Promise<void> {
    const key = await vscode.window.showInputBox({
      title: "Set Kimi Code API Key",
      prompt: "Enter your Kimi Code API key",
      placeHolder: "sk-...",
      password: true,
      ignoreFocusOut: true,
      validateInput: (value) => (value.trim() ? undefined : "API key cannot be empty."),
    });

    if (!key) {
      return;
    }

    await this.context.secrets.store(KIMI_CODE_SECRET_KEY, key.trim());
    this.clearCache();
    vscode.window.showInformationMessage("Kimi Code API key saved.");
  }

  async clearKimiCodeApiKey(): Promise<void> {
    await this.context.secrets.delete(KIMI_CODE_SECRET_KEY);
    this.clearCache();
    vscode.window.showInformationMessage("Kimi Code API key removed.");
  }

  async switchApiMode(): Promise<void> {
    const current = getApiMode();
    const items: Array<vscode.QuickPickItem & { mode: ApiMode }> = [
      {
        label: "$(cloud) Kimi Platform",
        description: "Pay as you go",
        detail: DEFAULT_BASE_URL,
        picked: current === "platform",
        mode: "platform",
      },
      {
        label: "$(code) Kimi Code Plan",
        description: "Subscription coding plan",
        detail: KIMI_CODE_BASE_URL,
        picked: current === "kimiCode",
        mode: "kimiCode",
      },
      {
        label: "$(settings-gear) Custom Base URL",
        description: "Compatible proxy or self-managed endpoint",
        detail: getConfiguredBaseUrl(),
        picked: current === "custom",
        mode: "custom",
      },
    ];

    const selected = await vscode.window.showQuickPick(items, {
      title: "Switch Kimi API Mode",
      placeHolder: "Choose which Kimi-compatible API this extension should use",
    });

    if (!selected) {
      return;
    }

    await vscode.workspace
      .getConfiguration(CONFIG_SECTION)
      .update("apiMode", selected.mode, vscode.ConfigurationTarget.Global);
    this.clearCache();
    vscode.window.showInformationMessage(`Kimi API mode switched to ${modeLabel(selected.mode)}.`);
  }

  openApiKeysPage(): void {
    const url =
      getApiMode() === "kimiCode" || isKimiCodeBaseUrl(getBaseUrl())
        ? "https://www.kimi.com/code"
        : "https://platform.kimi.ai/";
    void vscode.env.openExternal(vscode.Uri.parse(url));
  }

  openSettings(): void {
    void vscode.commands.executeCommand("workbench.action.openSettings", CONFIG_SECTION);
  }

  showLogs(): void {
    this.output.show();
  }

  async testConnection(): Promise<void> {
    const baseUrl = getBaseUrl();
    const apiKey = await this.getApiKey({ baseUrl });
    if (!apiKey) {
      vscode.window.showWarningMessage(
        isKimiCodeBaseUrl(baseUrl)
          ? "Missing Kimi Code API key. Run Kimi: Set Kimi Code API Key."
          : "Missing Kimi API key. Run Kimi: Set API Key.",
      );
      return;
    }

    const url = `${baseUrl}/models`;
    this.output.appendLine(`Testing Kimi connection: ${url}`);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });
      const body = await response.text().catch(() => "<unreadable>");
      const snippet = body.slice(0, 1200);
      this.output.appendLine(
        `Connection test result: ${response.status} ${response.statusText}\n${snippet}`,
      );

      if (response.ok) {
        vscode.window.showInformationMessage("Kimi connection test succeeded.");
      } else if (response.status === 401) {
        vscode.window.showWarningMessage(
          "Kimi endpoint is reachable, but the API key was rejected. See Kimi logs.",
        );
      } else if (response.status === 402 || response.status === 403) {
        vscode.window.showWarningMessage(
          "Kimi endpoint is reachable, but this key or account does not have access. See Kimi logs.",
        );
      } else {
        vscode.window.showWarningMessage(
          `Kimi endpoint is reachable, but /models returned ${response.status}. See Kimi logs.`,
        );
      }
    } catch (error) {
      const message = formatFetchFailure(error, url, "Kimi connection test");
      this.output.appendLine(message);
      vscode.window.showErrorMessage(
        "Kimi connection test failed before receiving an HTTP response. See Kimi logs.",
      );
    }

    this.output.show();
  }

  async openRequestDumpsFolder(): Promise<void> {
    const root = await this.ensureRequestDumpRoot();
    await vscode.commands.executeCommand("revealFileInOS", root);
  }

  async provideLanguageModelChatInformation(
    options: { silent?: boolean },
    _token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelChatInformation[]> {
    const presets = await this.loadPresets(options.silent ?? false);
    const hasKey = await this.hasApiKey(getBaseUrl());

    return presets.map((preset) => toChatInformation(preset, hasKey));
  }

  async provideLanguageModelChatResponse(
    model: vscode.LanguageModelChatInformation,
    messages: readonly vscode.LanguageModelChatRequestMessage[],
    options: vscode.ProvideLanguageModelChatResponseOptions,
    progress: vscode.Progress<vscode.LanguageModelResponsePart>,
    token: vscode.CancellationToken,
  ): Promise<void> {
    const baseUrl = getBaseUrl();
    const apiKey = await this.getApiKey({ baseUrl });
    if (!apiKey) {
      throw new Error(
        isKimiCodeBaseUrl(baseUrl)
          ? "Missing Kimi Code API key. Run Kimi: Set Kimi Code API Key to configure it."
          : "Missing Kimi API key. Run Kimi: Set API Key to configure it.",
      );
    }

    const preset = (await this.loadPresets(false)).find((p) => p.presetId === model.id);
    if (!preset) {
      throw new Error(`Unknown Kimi model: ${model.id}. Run Kimi: Refresh Models.`);
    }

    const reasoningEffort = getConfiguredThinkingEffort(options, preset);
    const thinkingEnabled =
      preset.capabilities.alwaysThinking ||
      (preset.capabilities.thinking && reasoningEffort !== "none");

    const kimiMessages = convertMessages(messages, {
      includeReasoning: thinkingEnabled,
    });

    if (kimiMessages.length === 0) {
      throw new Error("No supported text, media, or tool-result content was provided to Kimi.");
    }

    const tools = preset.capabilities.toolCalling ? convertTools(options.tools) : undefined;
    if ((tools?.length ?? 0) > TOOL_LIMIT) {
      throw new Error(`Kimi supports at most ${TOOL_LIMIT} tools per request.`);
    }

    const request: KimiChatRequest = {
      model: getApiModelId(preset.presetId, preset.modelId, baseUrl),
      messages: kimiMessages,
      stream: true,
      tools,
      tool_choice: tools && tools.length > 0 ? "auto" : undefined,
    };

    const maxTokens = getMaxTokens();
    if (maxTokens) {
      request.max_tokens = maxTokens;
    }

    applyThinkingConfig(request, preset, reasoningEffort);

    const totalRequestChars = countMessageChars(kimiMessages);
    const abortController = new AbortController();
    const disposable = token.onCancellationRequested(() => abortController.abort());

    this.logRequestSummary(preset, request, reasoningEffort);
    await this.dumpRequestIfEnabled(preset, request, reasoningEffort);

    try {
      await streamChatCompletion(baseUrl, apiKey, request, abortController.signal, {
        onContent: (text) => {
          progress.report(new vscode.LanguageModelTextPart(text));
        },
        onThinking: (text) => {
          const part = createThinkingPart(text);
          if (part) {
            progress.report(part);
          }
        },
        onToolCall: (toolCall) => {
          progress.report(
            new vscode.LanguageModelToolCallPart(
              toolCall.id,
              toolCall.function.name,
              parseToolArguments(toolCall.function.arguments),
            ),
          );
        },
        onUsage: (usage) => {
          this.updateCharsPerToken(totalRequestChars, usage);
          reportUsage(progress, usage);
        },
      });
    } finally {
      disposable.dispose();
    }
  }

  async provideTokenCount(
    _model: vscode.LanguageModelChatInformation,
    input: string | vscode.LanguageModelChatRequestMessage,
    _token: vscode.CancellationToken,
  ): Promise<number> {
    const result = estimateTokenCount(input, this.charsPerToken);
    return result.tokens;
  }

  private async loadPresets(silent: boolean): Promise<KimiPreset[]> {
    if (this.presets) {
      return this.presets;
    }

    let discovered = undefined;
    const baseUrl = getBaseUrl();
    const kimiCode = usesKimiCodeApi(baseUrl);
    const apiKey = await this.getApiKey({ silent: true, baseUrl });

    if (apiKey && getEnableModelDiscovery() && !kimiCode) {
      try {
        discovered = await fetchKimiModels(baseUrl, apiKey);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.output.appendLine(`Model discovery failed: ${message}`);
        if (!silent) {
          vscode.window.showWarningMessage(`Kimi model discovery failed. Using bundled model list.`);
        }
      }
    }

    this.presets = mergeDiscoveredModels(discovered, { kimiCode });
    return this.presets;
  }

  private async hasApiKey(baseUrl: string): Promise<boolean> {
    const key = await this.getApiKey({ silent: true, baseUrl });
    return Boolean(key);
  }

  private async getApiKey(options?: {
    silent?: boolean;
    baseUrl?: string;
  }): Promise<string | undefined> {
    const baseUrl = options?.baseUrl ?? getBaseUrl();
    if (usesKimiCodeApi(baseUrl)) {
      const codeKey = await this.context.secrets.get(KIMI_CODE_SECRET_KEY);
      if (codeKey?.trim()) {
        return codeKey.trim();
      }

      const envCodeKey = getEnvApiKey(KIMI_CODE_API_KEY_ENV_NAMES);
      if (envCodeKey) {
        await this.persistImportedKimiCodeApiKey(envCodeKey, "environment");
        return envCodeKey;
      }

      return this.getGeneralApiKey();
    }

    return this.getGeneralApiKey();
  }

  private async getGeneralApiKey(): Promise<string | undefined> {
    const key = await this.context.secrets.get(SECRET_KEY);
    if (key?.trim()) {
      return key.trim();
    }

    const legacyKey = await this.context.secrets.get(LEGACY_SECRET_KEY);
    if (legacyKey?.trim()) {
      return legacyKey.trim();
    }

    const settingsKey = getConfigValue<string>("apiKey", "");
    if (settingsKey.trim()) {
      const normalized = settingsKey.trim();
      await this.persistImportedApiKey(normalized, "settings");
      return normalized;
    }

    const envKey = getEnvApiKey(API_KEY_ENV_NAMES);
    if (envKey) {
      await this.persistImportedApiKey(envKey, "environment");
      return envKey;
    }

    return undefined;
  }

  private async persistImportedApiKey(apiKey: string, source: "environment" | "settings"): Promise<void> {
    await this.context.secrets.store(SECRET_KEY, apiKey);
    await this.context.secrets.delete(LEGACY_SECRET_KEY);
    this.output.appendLine(`Imported Kimi API key from ${source} into VS Code SecretStorage.`);
    this.clearCache();
  }

  private async persistImportedKimiCodeApiKey(
    apiKey: string,
    source: "environment" | "settings",
  ): Promise<void> {
    await this.context.secrets.store(KIMI_CODE_SECRET_KEY, apiKey);
    this.output.appendLine(`Imported Kimi Code API key from ${source} into VS Code SecretStorage.`);
    this.clearCache();
  }

  private logRequestSummary(
    preset: KimiPreset,
    request: KimiChatRequest,
    reasoningEffort: ReasoningEffort,
  ): void {
    if (getDebugMode() === "minimal") {
      return;
    }

    this.output.appendLine(
      JSON.stringify(
        {
          model: preset.presetId,
          apiModel: request.model,
          messages: request.messages.length,
          tools: request.tools?.length ?? 0,
          maxTokens: request.max_tokens ?? "api-default",
          thinking: request.thinking ?? (preset.capabilities.alwaysThinking ? "always-on" : "off"),
          reasoningEffort,
        },
        null,
        2,
      ),
    );
  }

  private updateCharsPerToken(totalRequestChars: number, usage: KimiUsage): void {
    const promptTokens = usage.prompt_tokens ?? 0;
    if (totalRequestChars > 0 && promptTokens > 0) {
      const observed = totalRequestChars / promptTokens;
      this.charsPerToken = this.charsPerToken * 0.7 + observed * 0.3;
    }
  }

  private async dumpRequestIfEnabled(
    preset: KimiPreset,
    request: KimiChatRequest,
    reasoningEffort: ReasoningEffort,
  ): Promise<void> {
    if (getDebugMode() !== "verbose") {
      return;
    }

    try {
      const root = await this.ensureRequestDumpRoot();
      const fileName = `${new Date().toISOString().replace(/[:.]/g, "-")}-${sanitizeFilePart(
        preset.presetId,
      )}.json`;
      const file = vscode.Uri.joinPath(root, fileName);
      const payload = {
        model: preset.presetId,
        apiModel: request.model,
        reasoningEffort,
        request,
      };
      await vscode.workspace.fs.writeFile(
        file,
        new TextEncoder().encode(JSON.stringify(payload, null, 2)),
      );
      this.output.appendLine(`Request dump written: ${file.fsPath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.output.appendLine(`Request dump failed: ${message}`);
    }
  }

  private async ensureRequestDumpRoot(): Promise<vscode.Uri> {
    const root = vscode.Uri.joinPath(this.context.globalStorageUri, "request-dumps");
    await vscode.workspace.fs.createDirectory(root);
    return root;
  }
}

function toChatInformation(
  preset: KimiPreset,
  hasApiKey: boolean,
): vscode.LanguageModelChatInformation {
  const apiKeyRequired = "Kimi API key required";
  return {
    id: preset.presetId,
    name: preset.displayName,
    family: preset.family,
    version: preset.version,
    maxInputTokens: preset.maxInputTokens,
    maxOutputTokens: preset.maxOutputTokens,
    detail: hasApiKey ? preset.detail : apiKeyRequired,
    tooltip: hasApiKey ? preset.tooltip : apiKeyRequired,
    capabilities: {
      imageInput: preset.capabilities.imageInput,
      toolCalling: preset.capabilities.toolCalling,
    },
    ...extraModelInfo(preset, hasApiKey),
  } as vscode.LanguageModelChatInformation;
}

function extraModelInfo(preset: KimiPreset, hasApiKey: boolean): Record<string, unknown> {
  return {
    isUserSelectable: true,
    statusIcon: hasApiKey ? undefined : new vscode.ThemeIcon("warning"),
    ...(supportsThinking(preset) ? { configurationSchema: buildThinkingSchema(preset) } : {}),
  };
}

function buildThinkingSchema(preset: KimiPreset): object {
  const canDisable = preset.capabilities.canDisableThinking;
  const values = canDisable ? ["none", "high", "max"] : ["high", "max"];

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
        default: "high",
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
  return "High";
}

function descriptionForThinkingEffort(value: ReasoningEffort, preset: KimiPreset): string {
  if (value === "none") {
    return "Disable Kimi thinking for faster replies when the model supports it.";
  }
  if (value === "max" && preset.capabilities.supportsPreservedThinking) {
    return "Enable thinking and keep previous reasoning content across turns.";
  }
  if (value === "max") {
    return "Enable thinking. This model does not support preserved thinking.";
  }
  return "Enable Kimi thinking for the current request.";
}

function getConfiguredThinkingEffort(
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
  if (configured === "max") {
    return "max";
  }
  return "high";
}

function applyThinkingConfig(
  request: KimiChatRequest,
  preset: KimiPreset,
  effort: ReasoningEffort,
): void {
  if (!preset.capabilities.thinking || preset.capabilities.alwaysThinking) {
    return;
  }

  if (effort === "none" && preset.capabilities.canDisableThinking) {
    request.thinking = { type: "disabled" };
    return;
  }

  request.thinking = { type: "enabled" };
  if (effort === "max" && preset.capabilities.supportsPreservedThinking) {
    request.thinking.keep = "all";
  }
}

function createThinkingPart(text: string): vscode.LanguageModelResponsePart | undefined {
  const ctor = (vscode as typeof vscode & {
    LanguageModelThinkingPart?: new (value: string | string[]) => vscode.LanguageModelResponsePart;
  }).LanguageModelThinkingPart;

  if (typeof ctor !== "function") {
    return undefined;
  }

  return new ctor(text);
}

function parseToolArguments(argumentsText: string): object {
  try {
    const parsed = JSON.parse(argumentsText);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function reportUsage(
  progress: vscode.Progress<vscode.LanguageModelResponsePart>,
  usage: KimiUsage,
): void {
  try {
    const data = {
      prompt_tokens: usage.prompt_tokens ?? 0,
      completion_tokens: usage.completion_tokens ?? 0,
      total_tokens: usage.total_tokens ?? 0,
      prompt_tokens_details: {
        cached_tokens: usage.prompt_cache_hit_tokens ?? 0,
      },
    };
    progress.report(
      new vscode.LanguageModelDataPart(
        new TextEncoder().encode(JSON.stringify(data)),
        USAGE_DATA_PART_MIME,
      ),
    );
  } catch {
    // Usage data is best-effort. It should never break the chat response.
  }
}

function getBaseUrl(): string {
  const mode = getApiMode();
  if (mode === "platform") {
    return DEFAULT_BASE_URL;
  }
  if (mode === "kimiCode") {
    return KIMI_CODE_BASE_URL;
  }

  return getConfiguredBaseUrl();
}

function getMaxTokens(): number | undefined {
  const value = getConfigValue("maxTokens", 0);
  return value > 0 ? value : undefined;
}

function getEnableModelDiscovery(): boolean {
  return getConfigValue("enableModelDiscovery", true);
}

function getDebugMode(): "minimal" | "metadata" | "verbose" {
  const value = getConfigValue<string>("debugMode", "minimal");
  return value === "metadata" || value === "verbose" ? value : "minimal";
}

function getApiModelId(vscodeModelId: string, defaultModelId: string, baseUrl: string): string {
  const overrides = getConfigValue<Record<string, string>>(
    "modelIdOverrides",
    getKnownModelIdOverrides(),
  );
  const override = overrides?.[vscodeModelId]?.trim();
  if (override) {
    return override;
  }

  return usesKimiCodeApi(baseUrl) ? KIMI_CODE_MODEL_ID : defaultModelId;
}

function getConfigValue<T>(key: string, defaultValue: T): T {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const value = config.get<T>(key);
  if (value !== undefined) {
    return value;
  }

  const legacyConfig = vscode.workspace.getConfiguration(LEGACY_CONFIG_SECTION);
  return legacyConfig.get<T>(key, defaultValue);
}

function sanitizeFilePart(value: string): string {
  return value.replace(/[^a-z0-9_.-]/gi, "_");
}

function getApiMode(): ApiMode {
  const configured = getExplicitApiMode();
  if (configured) {
    return configured;
  }

  const baseUrl = getConfiguredBaseUrl();
  if (baseUrl !== DEFAULT_BASE_URL) {
    return isKimiCodeBaseUrl(baseUrl) ? "kimiCode" : "custom";
  }

  return "platform";
}

function getExplicitApiMode(): ApiMode | undefined {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const inspected = config.inspect<string>("apiMode");
  const value =
    inspected?.workspaceFolderValue ??
    inspected?.workspaceValue ??
    inspected?.globalValue;

  if (value === "platform" || value === "kimiCode" || value === "custom") {
    return value;
  }

  return undefined;
}

function getConfiguredBaseUrl(): string {
  return normalizeBaseUrl(getConfigValue("baseUrl", DEFAULT_BASE_URL));
}

function usesKimiCodeApi(baseUrl: string): boolean {
  return getApiMode() === "kimiCode" || isKimiCodeBaseUrl(baseUrl);
}

function modeLabel(mode: ApiMode): string {
  if (mode === "kimiCode") {
    return "Kimi Code Plan";
  }
  if (mode === "custom") {
    return "Custom Base URL";
  }
  return "Kimi Platform";
}

function getEnvApiKey(names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
}
