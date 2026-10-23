import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const admin = await readFile(new URL("../apps/web/app/admin/page.tsx", import.meta.url), "utf8");
const middleware = await readFile(new URL("../apps/web/middleware.ts", import.meta.url), "utf8");
const dashboard = await readFile(new URL("../apps/web/app/dashboard/page.tsx", import.meta.url), "utf8");

test("private admin panel fails closed without explicit server-side allowlisting", () => {
  assert.match(admin, /process\.env\.PLATFORM_ADMIN_EMAILS/);
  assert.match(admin, /if \(!allowlist\.includes\(user\.email\.toLowerCase\(\)\)\) redirect\("\/dashboard"\)/);
  assert.match(admin, /membership\.role === "owner"/);
  assert.match(admin, /enforceOwnerMfa\(supabase, "owner"\)/);
});

test("middleware covers admin routes and sends unauthenticated requests to login", () => {
  assert.match(middleware, /pathname\.startsWith\("\/admin"\)/);
  assert.match(middleware, /"\/admin\/:path\*"/);
  assert.match(middleware, /"\/admin"/);
});

test("owner dashboard links to the separate admin panel", () => {
  assert.match(dashboard, /href="\/admin"/);
  assert.match(dashboard, /Private admin panel/);
});
