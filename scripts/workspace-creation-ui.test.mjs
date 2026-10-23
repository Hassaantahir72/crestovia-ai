import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../apps/web/app/onboarding/organization-form.tsx', import.meta.url), 'utf8');

test('workspace creation validates normalized company names and identifiers before RPC', () => {
  assert.match(source, /normalizedName\.length < 2 \|\| normalizedName\.length > 120/);
  assert.match(source, /\^\[a-z0-9\]\+\(\?:-\[a-z0-9\]\+\)\*\$/);
  assert.match(source, /p_name: normalizedName/);
  assert.match(source, /p_slug: normalizedSlug/);
});

test('workspace creation maps known database errors to safe user messages', () => {
  assert.match(source, /code === "23505"/);
  assert.match(source, /code === "42501"/);
  assert.match(source, /We couldn't create your workspace right now/);
  assert.doesNotMatch(source, /setError\(err instanceof Error \? err\.message/);
});

test('workspace creation keeps duplicate submission disabled while busy', () => {
  assert.match(source, /setBusy\(true\)/);
  assert.match(source, /finally\s*\{\s*setBusy\(false\);\s*\}/);
  assert.match(source, /disabled=\{busy\}/);
});
