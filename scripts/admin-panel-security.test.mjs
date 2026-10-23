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

test("private admin lists only the signed-in owner's active memberships", () => {
  assert.match(admin, /memberships\.filter\(\(membership\) => membership\.role === "owner"\)/);
  assert.match(admin, /membership\.organization_id/);
  assert.match(admin, /does not bypass organization access policies/);
});

test("admin configuration checks report allowlist presence without exposing email values", () => {
  assert.match(admin, /label: "Admin email allowlist"/);
  assert.match(admin, /ok: allowlist\.length > 0/);
  assert.match(admin, /PLATFORM_ADMIN_EMAILS/);
  assert.doesNotMatch(admin, /allowlist\.join/);
});

test("private admin reports secret-safe configuration presence without rendering values", () => {
  for (const name of ["GROQ_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "APP_MFA_SECRET", "RESEND_API_KEY", "RESEND_WEBHOOK_SECRET", "CRON_SECRET"]) {
    assert.ok(admin.includes(name), `missing configuration check for ${name}`);
  }
  assert.match(admin, /Presence-only checks for server configuration/);
  assert.match(admin, /Secret values are never displayed/);
  assert.match(admin, /strongSecret\("CRON_SECRET"\)/);
  assert.match(admin, /value is never displayed|values are never displayed/i);
});

test("company assistant describes organization-scoped read-only context and owner approvals", async () => {
  const assistant = await readFile(new URL("../apps/web/app/dashboard/assistant/page.tsx", import.meta.url), "utf8");
  assert.match(assistant, /Company &amp; Personal Assistant/);
  assert.match(assistant, /active organization/);
  assert.match(assistant, /proposed actions go through owner approval/i);
  assert.match(assistant, /private conversations and saved memories remain tied to your account/i);
});
