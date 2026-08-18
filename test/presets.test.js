const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getKnownModelIdOverrides,
  mergeDiscoveredModels,
} = require("../dist/presets");

const PLATFORM_MODEL_IDS = [
  "kimi-k3",
  "kimi-k2.7-code",
  "kimi-k2.7-code-highspeed",
  "kimi-k2.6",
  "kimi-k2.5",
  "moonshot-v1-128k-vision-preview",
  "moonshot-v1-32k-vision-preview",
  "moonshot-v1-8k-vision-preview",
  "moonshot-v1-128k",
  "moonshot-v1-32k",
  "moonshot-v1-8k",
];

const KIMI_CODE_MODEL_IDS = [
  "k3",
  "k3-256k",
  "kimi-for-coding",
  "kimi-for-coding-highspeed",
];

test("platform mode exposes only the complete Platform catalog", () => {
  const ids = mergeDiscoveredModels(undefined, "platform").map((model) => model.modelId);

  assert.deepEqual(ids, PLATFORM_MODEL_IDS);
});

test("Kimi Code mode exposes all four native Code model IDs", () => {
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
      .capabilities.alwaysThinking,
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

  for (const id of [...PLATFORM_MODEL_IDS, ...KIMI_CODE_MODEL_IDS]) {
    assert.equal(overrides[id], id);
  }
});
