# Kimi for Copilot Chat

Use Kimi and Moonshot models from the normal Copilot Chat model picker.

This extension is a BYOK provider. It does not add a second chat sidebar or a local proxy. Pick a Kimi model in Copilot Chat and keep using Copilot's agent mode, tools, instructions, and MCP setup.

Repository: https://github.com/lucatotem/Kimi-Extension

## What It Adds

- Kimi models in the Copilot Chat model picker
- API key storage through VS Code SecretStorage
- Optional one-time import from `KIMI_API_KEY` or `MOONSHOT_API_KEY`
- A switchable API mode for Kimi Platform, Kimi Code Plan, or custom proxies
- Complete endpoint-specific model catalogs for Kimi Platform and Kimi Code
- Native Copilot thinking blocks for Kimi `reasoning_content`
- Tool calls and tool results for agent mode
- Image and video content for Kimi models that support multimodal input
- Optional model discovery through Kimi's `/v1/models` endpoint
- Model ID overrides for compatible proxies

## Models

The picker follows the catalog of the active endpoint. Equivalent models use different API IDs on the two services, so the extension keeps the catalogs separate and sends the native ID shown below.

### Kimi Platform

| Model | API ID | Use for |
| --- | --- | --- |
| Kimi K3 | `kimi-k3` | Software engineering, knowledge work, deep reasoning, vision, and up to 1M context. |
| Kimi K2.7 Code | `kimi-k2.7-code` | Coding and agent tasks with thinking always on. |
| Kimi K2.7 Code High-Speed | `kimi-k2.7-code-highspeed` | The K2.7 coding model at higher output speed. |
| Kimi K2.6 | `kimi-k2.6` | General coding, agent, text, image, and video tasks with optional thinking. |
| Kimi K2.5 | `kimi-k2.5` | Previous multimodal K2 model with optional thinking. |
| Moonshot V1 8K / 32K / 128K | `moonshot-v1-*` | Text generation at different context lengths. |
| Moonshot V1 Vision 8K / 32K / 128K | `moonshot-v1-*-vision-preview` | Image understanding with text output. |

Kimi K2.5 and the Moonshot V1 series remain available to existing accounts, but Kimi has stopped enabling them for newly registered users and plans a platform-wide sunset on August 31, 2026.

### Kimi Code Plan

| Model | API ID | Availability |
| --- | --- | --- |
| Kimi K3 | `k3` | Moderato and above; up to 1M context requires Allegretto or above. |
| Kimi K3 256K | `k3-256k` | Moderato and above; fixed 256K context and no video input. |
| Kimi K2.7 Code | `kimi-for-coding` | All membership tiers. |
| Kimi K2.7 Code High-Speed | `kimi-for-coding-highspeed` | Allegretto and above. |

Kimi Code does not expose K2.6, K2.5, or Moonshot V1 as selectable API models. Kimi Platform does not expose the `kimi-for-coding` aliases. The extension therefore shows every documented model available on the active service rather than offering entries that the endpoint will reject.

When an API key is configured, the extension also merges models returned by the active endpoint's `GET /v1/models` response. This allows newly released models to appear without an extension update.

## API Modes

Use `Kimi: Switch API Mode` or the `kimi-copilot.apiMode` setting to choose the backend:

| Mode | Endpoint | Key command | Notes |
| --- | --- | --- | --- |
| Kimi Platform (Pay as you go) | `https://api.moonshot.ai/v1` | `Kimi: Set API Key` | Default mode for existing pay-as-you-go API keys. |
| Kimi Code Plan | `https://api.kimi.com/coding/v1` | `Kimi: Set Kimi Code API Key` | Offers the four documented Kimi Code model IDs and uses a separate subscription key. |
| Custom Base URL | `kimi-copilot.baseUrl` | `Kimi: Set API Key` | For OpenAI-compatible proxies or manually configured endpoints. |

Switching modes does not delete stored keys. The regular pay-as-you-go key is stored separately from the Kimi Code key, so users can move between modes without re-entering the other key.

To use a Kimi Code subscription plan:

1. Run `Kimi: Switch API Mode`.
2. Choose `Kimi Code Plan`.
3. Run `Kimi: Set Kimi Code API Key`.
4. Run `Kimi: Refresh Models` or reload VS Code.
5. Pick K3, K3 256K, K2.7 Code, or K2.7 Code High-Speed according to your membership tier.

To use the pay-as-you-go Kimi Platform:

1. Run `Kimi: Switch API Mode`.
2. Choose `Kimi Platform (Pay as you go)`.
3. Run `Kimi: Set API Key`.
4. Run `Kimi: Refresh Models` or reload VS Code.
5. Pick any model, for example `Kimi K3`, from the Copilot Chat model picker.

### Using both plans together

The extension stores the platform key and the Kimi Code key separately, so both plans can stay configured at the same time:

1. Run `Kimi: Set API Key` once for your platform key and `Kimi: Set Kimi Code API Key` once for your Kimi Code plan key.
2. Switch backends at any time with `Kimi: Switch API Mode`. Switching never deletes either key.
3. Each mode shows the complete catalog supported by its endpoint. Shared model names are sent with that endpoint's native ID, such as `kimi-k3` on Platform and `k3` on Kimi Code.
4. Use `kimi-copilot.modelIdOverrides` only when a compatible proxy or a new API alias requires a different ID.
5. Model discovery runs against the active endpoint whenever its key is set, so newly available models are merged into that mode's picker.

For diagnostics, run `Kimi: Test Connection` and then `Kimi: Show Logs`. The test reports whether the endpoint returned an HTTP status, or whether the request failed before reaching HTTP.

## Thinking

Kimi thinking models stream `reasoning_content` before the final answer. The extension reports those chunks as Copilot thinking parts, so they render separately from the response.

The Copilot model picker shows a Thinking control where Kimi supports it:

| Value | Kimi request |
| --- | --- |
| None | `thinking: { "type": "disabled" }` on K2.6/K2.5 |
| Low | `reasoning_effort: "low"` on K3 |
| High | Uses `reasoning_effort: "high"` on K3; otherwise sends `thinking: { "type": "enabled" }` |
| Max | Uses `reasoning_effort: "max"` on K3; otherwise enables thinking and uses `keep: "all"` where supported |

Kimi K3 always thinks and accepts `low`, `high`, or `max` reasoning effort. The picker defaults to `max` on Kimi Platform and `high` on Kimi Code, matching each service's documentation. Kimi K2.7 Code and its High-Speed variant also cannot disable thinking.

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
| `kimi-copilot.enableModelDiscovery` | `true` | Adds models returned by the active endpoint's `/v1/models` response when its key is set. |
| `kimi-copilot.modelIdOverrides` | official IDs | Maps native picker IDs to alternate API IDs, primarily for compatible proxies. |
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
