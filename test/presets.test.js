const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getKnownModelIdOverrides,
  mergeDiscoveredModels,
} = require("../dist/presets");

const PLATFORM_MODEL_IDS = [
  "kimi-k3.1-pro",
  "kimi-k3.1-pro-highspeed",
  "kimi-k3",
  "kimi-k2.7-code",
  "kimi-k2.7-code-highspeed",
  "kimi-k2.6",
];

const KIMI_CODE_MODEL_IDS = [
  "k3.1-pro",
  "k3.1-pro-highspeed",
  "k3",
  "k3-256k",
  "kimi-for-coding",
  "kimi-for-coding-highspeed",
];

test("platform mode exposes only the complete Platform catalog", () => {
  const ids = mergeDiscoveredModels(undefined, "platform").map((model) => model.modelId);

  assert.deepEqual(ids, PLATFORM_MODEL_IDS);
});

test("Kimi Code mode exposes all six native Code model IDs", () => {
  const ids = mergeDiscoveredModels(undefined, "kimiCode").map((model) => model.modelId);

  assert.deepEqual(ids, KIMI_CODE_MODEL_IDS);
});

test("Kimi Code discovery updates known aliases without creating duplicates", () => {
  const models = mergeDiscoveredModels(
    [
      {
        id: "k3",
        object: "model",
        context_length: 900000,
        supports_image_in: true,
        supports_video_in: true,
        supports_reasoning: true,
      },
      {
        id: "kimi-for-coding-highspeed",
        object: "model",
        context_length: 200000,
        supports_image_in: true,
        supports_video_in: true,
        supports_reasoning: true,
      },
    ],
    "kimiCode",
  );

  assert.equal(models.length, KIMI_CODE_MODEL_IDS.length);
  assert.equal(models.find((model) => model.modelId === "k3").contextLength, 900000);
  assert.equal(
    models.find((model) => model.modelId === "kimi-for-coding-highspeed")
      .capabilities.canDisableThinking,
    true,
  );
  assert.equal(
    models.find((model) => model.modelId === "kimi-for-coding-highspeed").maxOutputTokens,
    32768,
  );
});

test("K3 defaults match each endpoint", () => {
  const platformK3 = mergeDiscoveredModels(undefined, "platform").find(
    (model) => model.modelId === "kimi-k3",
  );
  const codeK3 = mergeDiscoveredModels(undefined, "kimiCode").find(
    (model) => model.modelId === "k3",
  );

  assert.equal(platformK3.capabilities.defaultReasoningEffort, "max");
  assert.equal(codeK3.capabilities.defaultReasoningEffort, "high");
});

test("custom mode includes native IDs from both official catalogs", () => {
  const ids = new Set(
    mergeDiscoveredModels(undefined, "custom").map((model) => model.modelId),
  );

  for (const id of [...PLATFORM_MODEL_IDS, ...KIMI_CODE_MODEL_IDS]) {
    assert.equal(ids.has(id), true, `missing ${id}`);
  }
});

test("the default override map covers every bundled native ID", () => {
  const overrides = getKnownModelIdOverrides();
  const manifest = require("../package.json");
  assert.deepEqual(manifest.contributes.configuration.properties["kimi-copilot.modelIdOverrides"].default, overrides);

  for (const id of [...PLATFORM_MODEL_IDS, ...KIMI_CODE_MODEL_IDS]) {
    assert.equal(overrides[id], id);
  }
});

const RETIRED_MODEL_IDS = [
  "kimi-latest", "kimi-thinking-preview", "kimi-k2-0711-preview",
  "kimi-k2-0905-preview", "kimi-k2-turbo-preview", "kimi-k2-thinking",
  "kimi-k2-thinking-turbo", "kimi-k2.5", "moonshot-v1-auto",
  "moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k",
  "moonshot-v1-8k-vision-preview", "moonshot-v1-32k-vision-preview",
  "moonshot-v1-128k-vision-preview",
];

test("official discovery cannot reintroduce discontinued models", () => {
  const discovered = RETIRED_MODEL_IDS.map((id) => ({ id, object: "model" }));
  for (const catalog of ["platform", "kimiCode"]) {
    const ids = new Set(mergeDiscoveredModels(discovered, catalog).map((model) => model.modelId));
    for (const id of RETIRED_MODEL_IDS) assert.equal(ids.has(id), false, `${catalog}: ${id}`);
  }
});

test("custom endpoints can still discover models retired by the hosted platform", () => {
  const models = mergeDiscoveredModels([{ id: "kimi-k2.5", object: "model" }], "custom");
  const legacy = models.find((model) => model.modelId === "kimi-k2.5");
  assert.ok(legacy);
  assert.equal(legacy.capabilities.supportsPreservedThinking, false);
});

test("the standard Code alias now exposes K2.8 Preview with 1M context and adjustable effort", () => {
  const model = mergeDiscoveredModels(undefined, "kimiCode").find((model) => model.modelId === "kimi-for-coding");
  assert.equal(model.displayName, "Kimi K2.8 Preview");
  assert.equal(model.maxInputTokens, 1048576);
  assert.equal(model.capabilities.defaultReasoningEffort, "max");
  assert.equal(model.capabilities.supportsReasoningEffort, true);
});

test("K3.1 models have native IDs, always-on reasoning, vision and tools on each endpoint", () => {
  for (const catalog of ["platform", "kimiCode"]) {
    const models = mergeDiscoveredModels(undefined, catalog).filter((model) => model.modelId.includes("k3.1"));
    assert.equal(models.length, 2);
    for (const model of models) {
      assert.equal(model.contextLength, 1048576);
      assert.equal(model.capabilities.alwaysThinking, true);
      assert.equal(model.capabilities.canDisableThinking, false);
      assert.equal(model.capabilities.supportsReasoningEffort, true);
      assert.equal(model.capabilities.imageInput, true);
      assert.equal(model.capabilities.toolCalling, 128);
      assert.equal(model.capabilities.defaultReasoningEffort, catalog === "platform" ? "max" : "high");
    }
  }
});

test("discovery respects account context limits without changing bundled defaults", () => {
  const models = mergeDiscoveredModels([{ id: "k3.1-pro", object: "model", context_length: 262144 }], "kimiCode");
  const limited = models.find((model) => model.modelId === "k3.1-pro");
  assert.equal(limited.maxInputTokens, 262144);
  assert.equal(limited.maxOutputTokens, 262144);
  assert.equal(mergeDiscoveredModels(undefined, "kimiCode")[0].maxInputTokens, 1048576);
});

test("discovery ignores malformed IDs and invalid context limits", () => {
  for (const context_length of [0, -1, NaN, Infinity, 1.5, "262144"]) {
    const models = mergeDiscoveredModels([null, {}, { id: 42 }, { id: " " },
      { id: "k3.1-pro", object: "model", context_length }], "kimiCode");
    assert.equal(models.length, KIMI_CODE_MODEL_IDS.length);
    assert.equal(models[0].contextLength, 1048576);
  }
});

test("new K3 versions discovered later retain reasoning effort and explicit capability flags", () => {
  const models = mergeDiscoveredModels([
    { id: "kimi-k3.1-pro-preview", object: "model", context_length: 1048576 },
    { id: "kimi-k3-next-text", object: "model", supports_image_in: false, supports_reasoning: false },
  ], "platform");
  const preview = models.find((model) => model.modelId === "kimi-k3.1-pro-preview");
  assert.equal(preview.capabilities.alwaysThinking, true);
  assert.equal(preview.capabilities.supportsReasoningEffort, true);
  const text = models.find((model) => model.modelId === "kimi-k3-next-text");
  assert.equal(text.capabilities.imageInput, false);
  assert.equal(text.capabilities.thinking, false);
  assert.equal(text.capabilities.alwaysThinking, false);
});
