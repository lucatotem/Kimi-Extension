# Kimi for Copilot Chat

Use Kimi and Moonshot models from the normal Copilot Chat model picker.

This extension is a BYOK provider. It does not add a second chat sidebar or a local proxy. Pick a Kimi model in Copilot Chat and keep using Copilot's agent mode, tools, instructions, and MCP setup.

## What It Adds

- Kimi models in the Copilot Chat model picker
- API key storage through VS Code SecretStorage
- Native Copilot thinking blocks for Kimi `reasoning_content`
- Tool calls and tool results for agent mode
- Image and video content for Kimi models that support multimodal input
- Optional model discovery through Kimi's `/v1/models` endpoint
- Model ID overrides for compatible proxies

## Models

The bundled picker entries are based on the current Kimi model list:

| Model | Use for |
| --- | --- |
| Kimi K2.7 Code | Coding and agent tasks. Thinking is always on. |
| Kimi K2.6 | General coding, agent tasks, text, image, and video. Thinking can be turned off. |
| Kimi K2.5 | Previous K2 model with thinking and multimodal input. |
| Moonshot V1 8K / 32K / 128K | Text generation at different context lengths. |
| Moonshot V1 Vision 8K / 32K / 128K | Image understanding with text output. |

When an API key is configured, the extension can also merge models returned by `GET /v1/models`.

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
| `Kimi: Set API Key` | Store your Kimi API key |
| `Kimi: Open API Keys` | Open the Kimi API key page |
| `Kimi: Clear API Key` | Remove the stored key |
| `Kimi: Open Settings` | Open extension settings |
| `Kimi: Show Logs` | Open the Kimi output channel |
| `Kimi: Open Request Dumps Folder` | Open verbose request dumps |
| `Kimi: Refresh Models` | Clear the model cache and run discovery again |

## Settings

| Setting | Default | Notes |
| --- | --- | --- |
| `kimi-copilot.baseUrl` | `https://api.moonshot.ai/v1` | Change this for compatible proxies. |
| `kimi-copilot.maxTokens` | `0` | `0` leaves the output limit to the API default. |
| `kimi-copilot.enableModelDiscovery` | `true` | Adds models returned by `/v1/models` when a key is set. |
| `kimi-copilot.modelIdOverrides` | official IDs | Maps picker entries to API model IDs. |
| `kimi-copilot.debugMode` | `minimal` | `verbose` writes full request dumps. Use it only while diagnosing issues. |

## Development

```bash
npm install
npm run compile
```

Press F5 in VS Code to launch an Extension Development Host.

## Notes

Kimi rejects empty user messages. This extension drops empty text-only messages and preserves assistant tool calls with empty content, which is the shape expected by OpenAI-compatible tool-calling APIs.

## License

MIT
