import assert from "node:assert/strict";
import test from "node:test";
import { runSmoke } from "./health-smoke.mjs";

test("smoke check requires healthy API liveness and readiness", async () => {
  const requested = [];
  const results = await runSmoke({ apiBaseUrl: "https://api.example.test", fetchImpl: async (url) => { requested.push(String(url)); return { ok: true, status: 200 }; } });
  assert.deepEqual(requested, ["https://api.example.test/health", "https://api.example.test/ready"]);
  assert.deepEqual(results.map((result) => result.ok), [true, true]);
});

test("smoke check optionally verifies the web app", async () => {
  const requested = [];
  const results = await runSmoke({ apiBaseUrl: "https://api.example.test", webBaseUrl: "https://app.example.test", fetchImpl: async (url) => { requested.push(String(url)); return { ok: true, status: 200 }; } });
  assert.equal(results.length, 3);
  assert.equal(requested[2], "https://app.example.test/");
});

test("smoke check fails when API readiness is not successful", async () => {
  let call = 0;
  const results = await runSmoke({ apiBaseUrl: "https://api.example.test", fetchImpl: async () => { call += 1; return call === 1 ? { ok: true, status: 200 } : { ok: false, status: 503 }; } });
  assert.deepEqual(results.map((result) => result.ok), [true, false]);
  assert.equal(results[1].status, 503);
});

test("smoke check records network errors without exposing exception details", async () => {
  const results = await runSmoke({ apiBaseUrl: "https://api.example.test", fetchImpl: async () => { throw new Error("private-network-detail"); } });
  assert.equal(results[0].ok, false);
  assert.equal(results[0].status, null);
  assert.doesNotMatch(JSON.stringify(results), /private-network-detail/);
});

test("smoke check rejects malformed URLs and embedded credentials", async () => {
  await assert.rejects(runSmoke({ apiBaseUrl: "not a URL" }), /API_BASE_URL must be a valid HTTP\(S\) URL/);
  await assert.rejects(runSmoke({ apiBaseUrl: "https://user:password@api.example.test" }), /without embedded credentials/);
});
