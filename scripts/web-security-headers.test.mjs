import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextConfig = await readFile(path.join(root, "apps", "web", "next.config.ts"), "utf8");

test("web app disables framework fingerprint header", () => {
  assert.match(nextConfig, /poweredByHeader:\s*false/);
});

test("web app defines baseline security headers", () => {
  for (const header of [
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Strict-Transport-Security",
  ]) assert.ok(nextConfig.includes(header), `missing security header: ${header}`);
  assert.match(nextConfig, /value:\s*"nosniff"/);
  assert.match(nextConfig, /value:\s*"DENY"/);
  assert.match(nextConfig, /microphone=\(self\)/);
});

test("web security headers are applied to all routes", () => {
  assert.match(nextConfig, /source:\s*"\/:path\*"/);
});
