import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const script = fileURLToPath(new URL("./preflight.mjs", import.meta.url));
const run = (args, env) => spawnSync(process.execPath, [script, ...args], {
  encoding: "utf8",
  env: { PATH: process.env.PATH, ...env },
});

test("web preflight passes with public Supabase configuration", () => {
  const result = run(["web"], {
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key",
  });
  assert.equal(result.status, 0, result.stderr);
});

test("preflight reports missing variable names without printing values", () => {
  const secretSentinel = "super-secret-sentinel-value";
  const result = run(["web"], { NEXT_PUBLIC_SUPABASE_URL: secretSentinel });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(result.stderr, new RegExp(secretSentinel));
});

test("production profile requires integration secrets", () => {
  const result = run(["web", "--production"], {
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(result.stderr, /CRON_SECRET/);
});

test("rejects sensitive variables exposed through NEXT_PUBLIC_", () => {
  const result = run(["web"], {
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key",
    NEXT_PUBLIC_GROQ_API_KEY: "should-not-be-public",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /NEXT_PUBLIC_GROQ_API_KEY/);
});

test("rejects placeholder configuration", () => {
  const result = run(["api"], {
    SUPABASE_URL: "https://YOUR_PROJECT_REF.supabase.co",
    SUPABASE_JWKS_URL: "https://project.supabase.co/auth/v1/.well-known/jwks.json",
    CORS_ORIGINS: "https://company.example.com",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /SUPABASE_URL/);
});
