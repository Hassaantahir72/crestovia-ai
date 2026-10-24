import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const login = await readFile(new URL("../apps/web/app/login/login-form.tsx", import.meta.url), "utf8");
const callback = await readFile(new URL("../apps/web/app/auth/callback/route.ts", import.meta.url), "utf8");
const reset = await readFile(new URL("../apps/web/app/reset-password/page.tsx", import.meta.url), "utf8");

test("login exposes password recovery without enabling public registration", () => {
  assert.match(login, /Forgot password\?/);
  assert.match(login, /resetPasswordForEmail\(email/);
  assert.match(login, /Account creation is intentionally admin-controlled/);
});

test("recovery callback accepts only safe local destinations", () => {
  assert.match(callback, /requestedNext\.startsWith\("\/"\)/);
  assert.match(callback, /!requestedNext\.startsWith\("\/\/"\)/);
  assert.match(callback, /exchangeCodeForSession\(code\)/);
});

test("reset page validates and updates the password", () => {
  assert.match(reset, /password\.length < 12/);
  assert.match(reset, /password !== confirmation/);
  assert.match(reset, /supabase\.auth\.updateUser\(\{ password \}\)/);
});
