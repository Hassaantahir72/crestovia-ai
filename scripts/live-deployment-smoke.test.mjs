import test from "node:test";
import assert from "node:assert/strict";
import { checkedUrl, runSmokeChecks } from "./live-deployment-smoke.mjs";

function logger() {
  return { lines: [], errors: [], log(value) { this.lines.push(value); }, error(value) { this.errors.push(value); } };
}

test("smoke checks require HTTPS", () => {
  assert.throws(() => checkedUrl("http://example.com"), /require HTTPS/);
  assert.equal(checkedUrl("https://example.com", "/health").href, "https://example.com/health");
});

test("smoke check makes only GET requests and validates all three endpoints", async () => {
  const calls = [];
  const log = logger();
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), method: options.method });
    if (String(url).endsWith("/health")) {
      return { ok: true, status: 200, json: async () => ({ status: "ok", service: "crestovia-ai-api" }) };
    }
    if (String(url).endsWith("/ready")) {
      return { ok: true, status: 200, json: async () => ({ status: "ready", service: "crestovia-ai-api" }) };
    }
    return { ok: true, status: 200 };
  };
  const result = await runSmokeChecks({ webUrl: "https://web.example", apiUrl: "https://api.example", fetchImpl, log });
  assert.deepEqual(result, { total: 3, passed: 3, failures: 0 });
  assert.equal(calls.length, 3);
  assert.ok(calls.every((call) => call.method === "GET"));
  assert.deepEqual(calls.map((call) => call.url), [
    "https://web.example/",
    "https://api.example/health",
    "https://api.example/ready",
  ]);
  assert.ok(log.lines.some((line) => line.includes("3/3 passed")));
});

test("smoke check fails closed when readiness payload is unexpected", async () => {
  const log = logger();
  const fetchImpl = async (url) => {
    if (String(url).endsWith("/health")) {
      return { ok: true, status: 200, json: async () => ({ status: "ok", service: "crestovia-ai-api" }) };
    }
    if (String(url).endsWith("/ready")) {
      return { ok: true, status: 200, json: async () => ({ status: "not-ready" }) };
    }
    return { ok: true, status: 200 };
  };
  const result = await runSmokeChecks({ webUrl: "https://web.example", apiUrl: "https://api.example", fetchImpl, log });
  assert.deepEqual(result, { total: 3, passed: 2, failures: 1 });
});

test("network failures are reported without leaking response details", async () => {
  const log = logger();
  const fetchImpl = async () => { throw new TypeError("secret-token-must-not-be-logged"); };
  const result = await runSmokeChecks({ webUrl: "https://web.example", apiUrl: "https://api.example", fetchImpl, log });
  assert.equal(result.failures, 3);
  assert.equal(log.errors.length, 3);
  assert.ok(log.errors.every((line) => !line.includes("secret-token")));
});
