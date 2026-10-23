import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const provider = await readFile(new URL("apps/web/lib/ai/provider.ts", root), "utf8");
const actions = await readFile(new URL("apps/web/app/dashboard/assistant/actions.ts", root), "utf8");
const page = await readFile(new URL("apps/web/app/dashboard/assistant/page.tsx", root), "utf8");

test("real assistant requests are HTTPS-pinned, redirect-blocked, and time bounded", () => {
  assert.match(provider, /https:\/\/api\.groq\.com\/openai\/v1\/chat\/completions/);
  assert.match(provider, /redirect:\s*"error"/);
  assert.match(provider, /AbortSignal\.timeout\(20000\)/);
  assert.match(actions, /redirect:\s*"error"/);
  assert.match(actions, /AbortSignal\.timeout\(10000\)/);
});

test("provider failure categories are safe and actionable without exposing raw errors", () => {
  for (const category of ["AI_PROVIDER_TIMEOUT", "AI_PROVIDER_INVALID_RESPONSE", "AI_PROVIDER_INVALID_CONFIGURATION"]) assert.ok(provider.includes(category));
  for (const key of ["ai_provider_timeout", "ai_provider_invalid_response", "ai_provider_invalid_configuration"]) assert.ok(page.includes(key));
  assert.match(provider, /error\.name==="TimeoutError"\|\|error\.name==="AbortError"/);
  assert.doesNotMatch(provider, /console\.(log|error)\(/);
});

test("model configuration is validated before sending a provider request", () => {
  assert.ok(provider.includes("if(!/^[A-Za-z0-9._:-]{1,120}$/.test(model))"));
});
