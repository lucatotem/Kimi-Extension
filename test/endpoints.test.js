const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeBaseUrl, isKimiCodeBaseUrl, isKimiPlatformBaseUrl } = require("../dist/endpoints");

test("both official Kimi Code regions normalize to the OpenAI-compatible v1 endpoint", () => {
  for (const host of ["api.kimi.com", "api.kimi.ai"]) {
    for (const path of ["/coding", "/coding/", "/coding/v1", "/coding/v1/"]) {
      const url = `https://${host}${path}`;
      assert.equal(normalizeBaseUrl(url), `https://${host}/coding/v1`);
      assert.equal(isKimiCodeBaseUrl(url), true);
    }
  }
});

test("official Platform regions retain retirement filtering when configured as custom URLs", () => {
  for (const host of ["api.moonshot.ai", "api.moonshot.cn"]) {
    assert.equal(isKimiPlatformBaseUrl(`https://${host}/v1/`), true);
  }
  for (const url of ["https://proxy.example/v1", "https://api.moonshot.ai.example/v1", "https://api.kimi.ai/coding/v1"]) {
    assert.equal(isKimiPlatformBaseUrl(url), false);
  }
});

test("other endpoints cannot select the Kimi Code key through matching URL fragments", () => {
  for (const url of ["https://api.moonshot.ai/v1", "https://proxy.example/v1", "not-a-url",
    "https://api.kimi.ai.example/coding/v1", "https://api.kimi.ai/coding-other",
    "https://proxy.example/api.kimi.com/coding"]) {
    assert.equal(isKimiCodeBaseUrl(url), false, url);
    assert.equal(normalizeBaseUrl(url), url);
  }
});
