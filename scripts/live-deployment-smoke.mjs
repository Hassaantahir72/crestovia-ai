#!/usr/bin/env node
/**
 * Read-only smoke check for the public Crestovia AI deployment.
 * Makes GET requests only; never logs response bodies, credentials, or headers.
 */
import { pathToFileURL } from "node:url";

export function checkedUrl(base, path = "") {
  const url = new URL(path, base.endsWith("/") ? base : base + "/");
  if (url.protocol !== "https:") {
    throw new Error("Smoke checks require HTTPS URLs.");
  }
  return url;
}

export async function request(name, url, validate, fetchImpl = fetch, log = console) {
  let response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(Number(process.env.SMOKE_TIMEOUT_MS ?? "45000")),
      headers: { "User-Agent": "Crestovia-Deployment-Smoke/1.0" },
    });
  } catch (error) {
    log.error(`FAIL ${name}: request failed (${error?.name ?? "network error"}).`);
    return false;
  }

  let valid = response.ok;
  if (valid && validate) {
    try {
      const payload = await response.json();
      valid = validate(payload);
    } catch {
      valid = false;
    }
  }

  log.log(`${valid ? "PASS" : "FAIL"} ${name}: HTTP ${response.status}`);
  return valid;
}

export async function runSmokeChecks({
  webUrl = process.env.CRESTOVIA_WEB_URL ?? "https://crestovia-ai.onrender.com",
  apiUrl = process.env.CRESTOVIA_API_URL ?? "https://crestovia-ai-api.onrender.com",
  fetchImpl = fetch,
  log = console,
} = {}) {
  const checks = [
    ["web root", checkedUrl(webUrl), null],
    ["API liveness", checkedUrl(apiUrl, "/health"), (body) =>
      body?.status === "ok" && body?.service === "crestovia-ai-api"],
    ["API readiness", checkedUrl(apiUrl, "/ready"), (body) =>
      body?.status === "ready" && body?.service === "crestovia-ai-api"],
  ];

  let failures = 0;
  for (const [name, url, validate] of checks) {
    if (!(await request(name, url, validate, fetchImpl, log))) failures += 1;
  }

  log.log(`Smoke checks: ${checks.length - failures}/${checks.length} passed.`);
  return { total: checks.length, passed: checks.length - failures, failures };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runSmokeChecks();
  if (result.failures) process.exitCode = 1;
}
