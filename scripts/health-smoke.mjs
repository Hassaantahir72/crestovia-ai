#!/usr/bin/env node
import process from "node:process";

const timeoutMs = 10_000;

function parseBaseUrl(value, name) {
  if (!value?.trim()) throw new Error(name + " is required");
  let url;
  try { url = new URL(value); } catch { throw new Error(name + " must be a valid HTTP(S) URL"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error(name + " must be an HTTP(S) URL without embedded credentials");
  }
  url.search = ""; url.hash = ""; url.pathname = "/";
  return url;
}

export async function runSmoke({ apiBaseUrl, webBaseUrl, fetchImpl = fetch }) {
  const api = parseBaseUrl(apiBaseUrl, "API_BASE_URL");
  const checks = [["API liveness", new URL("/health", api)], ["API readiness", new URL("/ready", api)]];
  if (webBaseUrl?.trim()) checks.push(["Web app", new URL("/", parseBaseUrl(webBaseUrl, "WEB_BASE_URL"))]);
  const results = [];
  for (const [name, url] of checks) {
    try {
      const response = await fetchImpl(url, { method: "GET", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
      results.push({ name, ok: response.ok, status: response.status });
    } catch { results.push({ name, ok: false, status: null }); }
  }
  return results;
}

async function main() {
  let results;
  try { results = await runSmoke({ apiBaseUrl: process.env.API_BASE_URL, webBaseUrl: process.env.WEB_BASE_URL }); }
  catch (error) {
    console.error("Crestovia AI smoke check configuration error: " + error.message);
    process.exitCode = 2; return;
  }
  for (const result of results) {
    const status = result.status === null ? "request failed" : "HTTP " + result.status;
    console.log((result.ok ? "PASS " : "FAIL ") + result.name + ": " + status);
  }
  if (results.some((result) => !result.ok)) {
    console.error("Deployment smoke check failed; response bodies and credentials are not printed."); process.exitCode = 1;
  } else console.log("Crestovia AI deployment smoke check passed.");
}

if (process.argv[1] && process.argv[1].endsWith("health-smoke.mjs")) await main();
