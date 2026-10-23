import assert from "node:assert/strict";
import test from "node:test";
import { checkGroqCompletion } from "./groq-live-smoke.mjs";

function response(status, payload = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

test("makes a bounded request to the fixed HTTPS endpoint and never returns model text", async () => {
  let request;
  const result = await checkGroqCompletion({
    apiKey: "synthetic-test-key",
    model: "test-model",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return response(200, { choices: [{ message: { content: "private response text" } }] });
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.category, "completion_succeeded");
  assert.equal(result.model, "test-model");
  assert.equal("content" in result, false);
  assert.equal(request.url, "https://api.groq.com/openai/v1/chat/completions");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.redirect, "error");
  assert.equal(request.options.cache, "no-store");
  assert.equal(JSON.parse(request.options.body).max_tokens, 8);
  assert.equal(request.options.headers.Authorization, "Bearer synthetic-test-key");
});

test("reports missing configuration without making a request", async () => {
  let called = false;
  const result = await checkGroqCompletion({ apiKey: "", fetchImpl: async () => { called = true; } });
  assert.equal(result.category, "missing_configuration");
  assert.equal(called, false);
});

test("classifies rejected credentials and rate limits without exposing response bodies", async () => {
  for (const [status, category] of [[401, "authentication_rejected"], [403, "authentication_rejected"], [429, "rate_limited"]]) {
    const result = await checkGroqCompletion({ apiKey: "synthetic", fetchImpl: async () => response(status, { error: { message: "secret provider detail" } }) });
    assert.equal(result.category, category);
    assert.equal(JSON.stringify(result).includes("secret provider detail"), false);
  }
});

test("does not disclose provider error bodies or malformed responses", async () => {
  const failed = await checkGroqCompletion({ apiKey: "synthetic", fetchImpl: async () => response(500, { error: { message: "private detail" } }) });
  assert.equal(failed.category, "provider_error");
  assert.equal(JSON.stringify(failed).includes("private detail"), false);
  const malformed = await checkGroqCompletion({ apiKey: "synthetic", fetchImpl: async () => response(200, { choices: [] }) });
  assert.equal(malformed.category, "invalid_provider_response");
});

test("classifies timeout/network errors and rejects unsafe configuration", async () => {
  const timeout = await checkGroqCompletion({ apiKey: "synthetic", fetchImpl: async () => { const error = new Error("timeout"); error.name = "AbortError"; throw error; } });
  assert.equal(timeout.category, "timeout");
  const network = await checkGroqCompletion({ apiKey: "synthetic", fetchImpl: async () => { throw new Error("private network detail"); } });
  assert.equal(network.category, "network_or_tls_error");
  assert.equal(JSON.stringify(network).includes("private network detail"), false);
  assert.equal((await checkGroqCompletion({ apiKey: "synthetic", model: "bad model" })).category, "invalid_configuration");
  assert.equal((await checkGroqCompletion({ apiKey: "synthetic", timeoutMs: 30_001 })).category, "invalid_configuration");
});
