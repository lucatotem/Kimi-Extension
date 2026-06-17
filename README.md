# Kimi for Copilot Chat

Use Kimi and Moonshot models from the normal Copilot Chat model picker.

This extension is a BYOK provider. It does not add a second chat sidebar or a local proxy. Pick a Kimi model in Copilot Chat and keep using Copilot's agent mode, tools, instructions, and MCP setup.

Repository: https://github.com/lucatotem/Kimi-Extension

## What It Adds

- Kimi models in the Copilot Chat model picker
- API key storage through VS Code SecretStorage
- Optional one-time import from `KIMI_API_KEY` or `MOONSHOT_API_KEY`
- A switchable API mode for Kimi Platform, Kimi Code Plan, or custom proxies
- Native Copilot thinking blocks for Kimi `reasoning_content`
- Tool calls and tool results for agent mode
- Image and video content for Kimi models that support multimodal input
- Optional model discovery through Kimi's `/v1/models` endpoint
- Model ID overrides for compatible proxies

## Models

The bundled picker entries are based on the current Kimi model list:

| Model | Use for |
| --- | --- |
| Kimi Code | Kimi Code subscription/coding-plan users. Uses `kimi-for-coding`. |
| Kimi K2.7 Code | Coding and agent tasks. Thinking is always on. |
| Kimi K2.6 | General coding, agent tasks, text, image, and video. Thinking can be turned off. |
| Kimi K2.5 | Previous K2 model with thinking and multimodal input. |
| Moonshot V1 8K / 32K / 128K | Text generation at different context lengths. |
| Moonshot V1 Vision 8K / 32K / 128K | Image understanding with text output. |

When an API key is configured, the extension can also merge models returned by `GET /v1/models`.

## API Modes

Use `Kimi: Switch API Mode` or the `kimi-copilot.apiMode` setting to choose the backend:

| Mode | Endpoint | Key command | Notes |
| --- | --- | --- | --- |
| Kimi Platform (Pay as you go) | `https://api.moonshot.ai/v1` | `Kimi: Set API Key` | Default mode for existing pay-as-you-go API keys. |
| Kimi Code Plan | `https://api.kimi.com/coding/v1` | `Kimi: Set Kimi Code API Key` | Uses the `kimi-for-coding` model ID required by the Kimi Code endpoint. |
| Custom Base URL | `kimi-copilot.baseUrl` | `Kimi: Set API Key` | For OpenAI-compatible proxies or manually configured endpoints. |

Switching modes does not delete stored keys. The regular pay-as-you-go key is stored separately from the Kimi Code key, so users can move between modes without re-entering the other key.

To use a Kimi Code subscription plan:

1. Run `Kimi: Switch API Mode`.
2. Choose `Kimi Code Plan`.
3. Run `Kimi: Set Kimi Code API Key`.
4. Run `Kimi: Refresh Models` or reload VS Code.
5. Pick `Kimi Code` from the Copilot Chat model picker.

For diagnostics, run `Kimi: Test Connection` and then `Kimi: Show Logs`. The test reports whether the endpoint returned an HTTP status, or whether the request failed before reaching HTTP.

## Thinking

Kimi thinking models stream `reasoning_content` before the final answer. The extension reports those chunks as Copilot thinking parts, so they render separately from the response.

The Copilot model picker shows a Thinking control where Kimi supports it:

| Value | Kimi request |
| --- | --- |
| None | `thinking: { "type": "disabled" }` on K2.6/K2.5 |
| High | `thinking: { "type": "enabled" }` |
| Max | Enables thinking and uses `keep: "all"` where Kimi supports preserved thinking |

Kimi K2.7 Code cannot disable thinking, so the picker only offers supported values for that model.

## Commands

| Command | What it does |
| --- | --- |
| `Kimi: Switch API Mode` | Choose Kimi Platform, Kimi Code Plan, or Custom Base URL |
| `Kimi: Set API Key` | Store your Kimi Platform or custom endpoint API key |
| `Kimi: Set Kimi Code API Key` | Store your Kimi Code subscription API key |
| `Kimi: Open API Keys` | Open the Kimi API key page |
| `Kimi: Clear API Key` | Remove the stored Kimi Platform/custom key |
| `Kimi: Clear Kimi Code API Key` | Remove only the stored Kimi Code key |
| `Kimi: Open Settings` | Open extension settings |
| `Kimi: Show Logs` | Open the Kimi output channel |
| `Kimi: Test Connection` | Test `/models` and write the HTTP result or fetch failure cause to logs |
| `Kimi: Open Request Dumps Folder` | Open verbose request dumps |
| `Kimi: Refresh Models` | Clear the model cache and run discovery again |

## Settings

| Setting | Default | Notes |
| --- | --- | --- |
| `kimi-copilot.apiMode` | `platform` | Selects Kimi Platform, Kimi Code Plan, or Custom Base URL. |
| `kimi-copilot.baseUrl` | `https://api.moonshot.ai/v1` | Used when `apiMode` is `custom`. Older installs with a custom `baseUrl` and no `apiMode` setting keep using that URL. |
| `kimi-copilot.maxTokens` | `0` | `0` leaves the output limit to the API default. |
| `kimi-copilot.enableModelDiscovery` | `true` | Adds models returned by `/v1/models` when a key is set. Kimi Code mode uses the bundled `Kimi Code` preset instead. |
| `kimi-copilot.modelIdOverrides` | official IDs | Maps picker entries to API model IDs. |
| `kimi-copilot.debugMode` | `minimal` | `verbose` writes full request dumps. Use it only while diagnosing issues. |

## API Key Storage

Use `Kimi: Set API Key` once for Kimi Platform or custom endpoints. Use `Kimi: Set Kimi Code API Key` for the Kimi Code plan. Both keys are stored with VS Code SecretStorage, which uses the operating system keychain where VS Code supports it.

You can also start VS Code with one of these environment variables set:

```bash
KIMI_API_KEY=sk-...
MOONSHOT_API_KEY=sk-...
KIMI_CODE_API_KEY=sk-...
```

When the extension sees one of those variables and no matching key is already stored, it imports the value into SecretStorage. `KIMI_API_KEY` and `MOONSHOT_API_KEY` import into the regular key slot; `KIMI_CODE_API_KEY` imports into the Kimi Code key slot. After that, you do not need to recreate or re-enter the key each time you use the extension.

## Development

```bash
npm install
npm run compile
```

Press F5 in VS Code to launch an Extension Development Host.

## Notes

Kimi rejects empty user messages. This extension drops empty text-only messages and preserves assistant tool calls with empty content, which is the shape expected by OpenAI-compatible tool-calling APIs.

Development note: this extension was built by ivanray with AI assistance. The goal is to match the Copilot Chat BYOK provider experience while keeping the Kimi-specific request handling clear and reviewable.

## License

MIT
