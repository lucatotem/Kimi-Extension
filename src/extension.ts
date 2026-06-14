// src/extension.ts
// Entry point for the Kimi Copilot Presets VS Code extension.
//
// Registers:
//  - A LanguageModelChatProvider for Kimi models.
//  - Commands for API key management and model refresh.
//  - Configuration contributions defined in package.json.

import * as vscode from "vscode";
import { KimiChatProvider } from "./kimiProvider";

const SECRET_KEY = "kimiCopilot.apiKey";

/**
 * Activate the extension.
 *
 * Called by VS Code when any of the activation events fire:
 *   - onLanguageModelChatProvider:kimi
 *   - onCommand:kimiCopilot.manage
 *   - onCommand:kimiCopilot.setApiKey
 *   - onCommand:kimiCopilot.refreshModels
 */
export function activate(context: vscode.ExtensionContext): void {
  const provider = new KimiChatProvider(context);

  // ── Register the chat provider ────────────────────────────────────
  context.subscriptions.push(
    vscode.lm.registerLanguageModelChatProvider("kimi", provider),
  );

  // ── Command: Set API Key ──────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand("kimiCopilot.setApiKey", async () => {
      const key = await vscode.window.showInputBox({
        title: "Set Kimi API Key",
        prompt: "Enter your Moonshot/Kimi API key",
        placeHolder: "sk-...",
        password: true,
        ignoreFocusOut: true,
        validateInput: (value) => {
          if (!value.trim()) {
            return "API key cannot be empty.";
          }
          return undefined;
        },
      });

      if (key) {
        await context.secrets.store(SECRET_KEY, key.trim());
        provider.clearCache();
        vscode.window.showInformationMessage("Kimi API key saved.");
      }
    }),
  );

  // ── Command: Refresh Models ───────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand("kimiCopilot.refreshModels", async () => {
      provider.clearCache();

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Discovering Kimi models…",
          cancellable: false,
        },
        async () => {
          await provider.warmup();
        },
      );

      vscode.window.showInformationMessage("Kimi models refreshed.");
    }),
  );

  // ── Command: Manage (managementCommand) ───────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand("kimiCopilot.manage", async () => {
      const hasKey = !!(await context.secrets.get(SECRET_KEY));
      const keyStatus = hasKey ? "$(check) API key is set" : "$(warning) No API key configured";

      const choice = await vscode.window.showQuickPick(
        [
          {
            label: hasKey ? "$(key) Update API Key" : "$(key) Set API Key",
            description: keyStatus,
            id: "setKey",
          },
          {
            label: "$(refresh) Refresh Models",
            description: "Re-discover models from the Kimi API",
            id: "refresh",
          },
          {
            label: "$(info) About Kimi Copilot Presets",
            description: "View extension information",
            id: "about",
          },
        ],
        {
          title: "Manage Kimi Copilot Presets",
          placeHolder: "Choose an action",
        },
      );

      if (!choice) return;

      switch (choice.id) {
        case "setKey":
          await vscode.commands.executeCommand("kimiCopilot.setApiKey");
          break;
        case "refresh":
          await vscode.commands.executeCommand("kimiCopilot.refreshModels");
          break;
        case "about":
          vscode.window.showInformationMessage(
            "Kimi Copilot Presets v0.0.1 — Adds Kimi/Moonshot models and reasoning presets to VS Code Chat.",
            { modal: false },
          );
          break;
      }
    }),
  );

  // ── Status bar indicator ──────────────────────────────────────────
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.command = "kimiCopilot.manage";
  statusBarItem.text = "$(comment-discussion) Kimi";
  statusBarItem.tooltip = "Manage Kimi Copilot Presets";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  console.log("Kimi Copilot Presets extension activated.");
}

/**
 * Deactivate the extension.
 * Called by VS Code when the extension is disabled or uninstalled.
 */
export function deactivate(): void {
  // Cleanup is handled automatically via context.subscriptions.
  console.log("Kimi Copilot Presets extension deactivated.");
}
