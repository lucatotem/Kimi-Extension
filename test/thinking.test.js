const test = require("node:test");
const assert = require("node:assert/strict");
const { mergeDiscoveredModels } = require("../dist/presets");
const { applyThinkingConfig, buildThinkingSchema, getConfiguredThinkingEffort } = require("../dist/thinking");

function requestFor(catalog, id, effort) {
  const preset = mergeDiscoveredModels(undefined, catalog).find((model) => model.modelId === id);
  const request = { model: preset.modelId, messages: [{ role: "user", content: "Hi" }], stream: true };
  const configured = getConfiguredThinkingEffort({ modelConfiguration: { reasoningEffort: effort } }, preset);
  applyThinkingConfig(request, preset, configured);
  return { request, preset, configured };
}

test("K3.1 sends native IDs and reasoning_effort without the K2 thinking parameter", () => {
  for (const [catalog, id] of [["platform", "kimi-k3.1-pro"], ["platform", "kimi-k3.1-pro-highspeed"],
    ["kimiCode", "k3.1-pro"], ["kimiCode", "k3.1-pro-highspeed"]]) {
    for (const effort of ["low", "high", "max"]) {
      const { request, preset } = requestFor(catalog, id, effort);
      assert.equal(request.model, id);
      assert.equal(request.reasoning_effort, effort);
      assert.equal(request.thinking, undefined);
      assert.deepEqual(buildThinkingSchema(preset).properties.reasoningEffort.enum, ["low", "high", "max"]);
    }
    const { request } = requestFor(catalog, id, "none");
    assert.equal(request.reasoning_effort, catalog === "platform" ? "max" : "high");
    assert.equal(request.thinking, undefined);
  }
});

test("Code None sends thinking disabled without a conflicting reasoning effort", () => {
  for (const id of ["k3", "k3-256k", "kimi-for-coding", "kimi-for-coding-highspeed"]) {
    const { request, preset, configured } = requestFor("kimiCode", id, "none");
    assert.equal(configured, "none");
    assert.deepEqual(request.thinking, { type: "disabled" });
    assert.equal(request.reasoning_effort, undefined);
    assert.ok(buildThinkingSchema(preset).properties.reasoningEffort.enum.includes("none"));
  }
});

test("K2.8 effort defaults to max and supports low, high, and max", () => {
  for (const effort of [undefined, "low", "high", "max"]) {
    const { request } = requestFor("kimiCode", "kimi-for-coding", effort);
    assert.equal(request.reasoning_effort, effort ?? "max");
    assert.equal(request.thinking, undefined);
  }
});

test("Platform K2.7 never receives unsupported thinking or reasoning parameters", () => {
  for (const id of ["kimi-k2.7-code", "kimi-k2.7-code-highspeed"]) {
    for (const effort of ["none", "low", "high", "max"]) {
      const { request } = requestFor("platform", id, effort);
      assert.equal(request.thinking, undefined);
      assert.equal(request.reasoning_effort, undefined);
    }
  }
});

test("Platform K2.6 still supports disabled and preserved thinking", () => {
  assert.deepEqual(requestFor("platform", "kimi-k2.6", "none").request.thinking, { type: "disabled" });
  assert.deepEqual(requestFor("platform", "kimi-k2.6", "max").request.thinking, { type: "enabled", keep: "all" });
});

test("legacy configuration fields still select reasoning effort", () => {
  const preset = mergeDiscoveredModels(undefined, "kimiCode")[0];
  assert.equal(getConfiguredThinkingEffort({ configuration: { reasoningEffort: "low" } }, preset), "low");
  assert.equal(getConfiguredThinkingEffort({ modelConfiguration: { reasoningEffort: "invalid" } }, preset), "high");
});
