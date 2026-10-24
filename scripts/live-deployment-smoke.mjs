#!/usr/bin/env node
/**
 * Read-only smoke check for the public Crestovia AI deployment.
 * Makes GET requests only; never logs response bodies, credentials, or headers.
 */
const webUrl = process.env.CRESTOVIA_WEB_URL ?? "https://crestovia-ai.onrender.com";
const apiUrl = process.env.CRESTOVIA_API_URL ?? "https://crestovia-ai-api.onrender.com";
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? "45000");

function checkedUrl(base, path = "") {
  const url = new URL(path, base.endsWith("/") ? base : base + "/");
  if (url.protocol !== "https:") {
    throw new Error("Smoke checks require HTTPS URLs.");
  }
  return url;
}

async function request(name, url, validate) {
  let response;
  try {
    response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "Crestovia-Deployment-Smoke/1.0" },
    });
  } catch (error) {
    console.error(`FAIL ${name}: request failed (${error?.name ?? "network error"}).`);
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

  console.log(`${valid ? "PASS" : "FAIL"} ${name}: HTTP ${response.status}`);
  return valid;
}

const checks = [
  ["web root", checkedUrl(webUrl), null],
  ["API liveness", checkedUrl(apiUrl, "/health"), (body) =>
    body?.status === "ok" && body?.service === "crestovia-ai-api"],
  ["API readiness", checkedUrl(apiUrl, "/ready"), (body) =>
    body?.status === "ready" && body?.service === "crestovia-ai-api"],
];

let failures = 0;
for (const [name, url, validate] of checks) {
  if (!(await request(name, url, validate))) failures += 1;
}

console.log(`Smoke checks: ${checks.length - failures}/${checks.length} passed.`);
if (failures) process.exitCode = 1;
