// src/extension.ts
// Entry point for the Kimi Copilot VS Code extension.

import * as vscode from "vscode";
import { KimiChatProvider } from "./kimiProvider";

export function activate(context: vscode.ExtensionContext): void {
  const provider = new KimiChatProvider(context);

  context.subscriptions.push(
    vscode.lm.registerLanguageModelChatProvider("kimi", provider),
    vscode.commands.registerCommand("kimi-copilot.switchApiMode", () => provider.switchApiMode()),
    vscode.commands.registerCommand("kimi-copilot.setApiKey", () => provider.configureApiKey()),
    vscode.commands.registerCommand("kimi-copilot.setKimiCodeApiKey", () =>
      provider.configureKimiCodeApiKey(),
    ),
    vscode.commands.registerCommand("kimi-copilot.getApiKey", () => provider.openApiKeysPage()),
    vscode.commands.registerCommand("kimi-copilot.clearApiKey", () => provider.clearApiKey()),
    vscode.commands.registerCommand("kimi-copilot.clearKimiCodeApiKey", () =>
      provider.clearKimiCodeApiKey(),
    ),
    vscode.commands.registerCommand("kimi-copilot.openSettings", () => provider.openSettings()),
    vscode.commands.registerCommand("kimi-copilot.showLogs", () => provider.showLogs()),
    vscode.commands.registerCommand("kimi-copilot.testConnection", () =>
      provider.testConnection(),
    ),
    vscode.commands.registerCommand("kimi-copilot.openRequestDumpsFolder", () =>
      provider.openRequestDumpsFolder(),
    ),
    vscode.commands.registerCommand("kimi-copilot.refreshModels", async () => {
      provider.clearCache();
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Refreshing Kimi models",
          cancellable: false,
        },
        () => provider.warmup(),
      );
      vscode.window.showInformationMessage("Kimi models refreshed.");
    }),

    // Backward-compatible command aliases from the first local build.
    vscode.commands.registerCommand("kimiCopilot.setApiKey", () => provider.configureApiKey()),
    vscode.commands.registerCommand("kimiCopilot.refreshModels", () =>
      vscode.commands.executeCommand("kimi-copilot.refreshModels"),
    ),
    vscode.commands.registerCommand("kimiCopilot.manage", () =>
      vscode.commands.executeCommand("kimi-copilot.openSettings"),
    ),
  );

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.command = "kimi-copilot.openSettings";
  statusBarItem.text = "$(comment-discussion) Kimi";
  statusBarItem.tooltip = "Kimi Copilot settings";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

export function deactivate(): void {
  // All disposables are registered on the extension context.
}
