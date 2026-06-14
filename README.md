# Kimi Copilot Presets

Adds **Kimi / Moonshot** chat models to VS Code's Copilot Chat model picker — with automatic model discovery.

## Features

- **Auto-discovers** available Kimi models via the `/v1/models` API
- **Curated presets** for `kimi-k2.6` and `kimi-k2.7-code` with correct `thinking` configurations
- **Hides reasoning_content** by default (toggle via `kimiCopilot.showReasoning`)
- **Secure API key storage** using VS Code's `SecretStorage`
- **Streaming** SSE chat completions
- **Extensible** — new Kimi models appear automatically via the generic fallback

## Quick Start

1. Install the extension
2. Run `Kimi: Set API Key` from the Command Palette
3. Enter your [Moonshot/Kimi API key](https://platform.kimi.ai/)
4. Open Copilot Chat — your Kimi models appear in the model picker

All Kimi models have a **256k token context window**.

## Available Presets

| Preset | Model | Max Output | Context | Description |
|---|---|---|---|---|
| Kimi K2.7 Code — 32k | `kimi-k2.7-code` | 32,768 | 256k | Code-focused, thinking always on |
| Kimi K2.7 Code — 64k | `kimi-k2.7-code` | 65,536 | 256k | Longer output for large coding tasks |
| Kimi K2.6 — Thinking 32k | `kimi-k2.6` | 32,768 | 256k | General-purpose thinking mode |
| Kimi K2.6 — Instant 16k | `kimi-k2.6` | 16,384 | 256k | No-thinking for quick edits |
| Kimi K2.6 — Thinking Keep 32k | `kimi-k2.6` | 32,768 | 256k | Preserves reasoning across turns |

## Commands

| Command | Description |
|---|---|
| `Kimi: Set API Key` | Store or update your Kimi API key |
| `Kimi: Refresh Models` | Re-discover models from the Kimi API |
| `Kimi: Manage Models` | Management hub for all Kimi settings |

## Settings

| Setting | Default | Description |
|---|---|---|
| `kimiCopilot.baseUrl` | `https://api.moonshot.ai/v1` | Base URL for the Kimi API |
| `kimiCopilot.showReasoning` | `false` | Show raw reasoning_content in chat output |
| `kimiCopilot.enableExperimentalPresets` | `true` | Generate generic presets for unknown Kimi models |

## Requirements

- VS Code `^1.104.0` (for `LanguageModelChatProvider` API)
- A [Kimi/Moonshot API key](https://platform.kimi.ai/)

## Development

```bash
npm install
npm run compile
# Press F5 to launch the Extension Development Host
```

## License

MIT
