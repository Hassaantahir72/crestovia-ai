import test from 'node:test';
import assert from 'node:assert/strict';
import { runMutationAcceptance, validateMutationFixtures } from './tenant-isolation-mutation-acceptance.mjs';

const idA = '11111111-1111-4111-8111-111111111111';
const idB = '22222222-2222-4222-8222-222222222222';
const fixture = { table: 'projects', orgAId: idA, orgBId: idB, probeColumn: 'description', originalValue: 'synthetic-original', attemptValue: 'synthetic-attack' };
const fixtures = { tables: [fixture] };
const env = {
  CRESTOVIA_STAGING_SUPABASE_URL: 'https://xpwrsxmwqptrpwycibub.supabase.co',
  CRESTOVIA_STAGING_SUPABASE_PUBLISHABLE_KEY: 'public-test-key',
  CRESTOVIA_STAGING_ORG_A_USER_TOKEN: 'token-a',
  CRESTOVIA_STAGING_ORG_B_USER_TOKEN: 'token-b',
  CRESTOVIA_ALLOW_STAGING_MUTATIONS: 'YES_I_HAVE_SYNTHETIC_FIXTURES',
};

test('mutation fixtures require allowlisted tables, valid IDs, and distinct safe probe values', () => {
  assert.equal(validateMutationFixtures(fixtures).length, 1);
  assert.throws(() => validateMutationFixtures({ tables: [{ ...fixture, table: 'organizations' }] }), /not mutation-allowlisted/);
  assert.throws(() => validateMutationFixtures({ tables: [{ ...fixture, orgBId: idA }] }), /two distinct UUID/);
  assert.throws(() => validateMutationFixtures({ tables: [{ ...fixture, probeColumn: 'description;delete' }] }), /probeColumn that is not allowlisted/);
  assert.throws(() => validateMutationFixtures({ tables: [{ ...fixture, attemptValue: fixture.originalValue }] }), /distinct/);
});

test('refuses writes unless both the CLI opt-in and environment acknowledgement are present', async () => {
  await assert.rejects(() => runMutationAcceptance({ env, fixtures, write: () => {} }), /explicit --allow-staging-writes flag/);
  await assert.rejects(() => runMutationAcceptance({ env: { ...env, CRESTOVIA_ALLOW_STAGING_MUTATIONS: '' }, fixtures, allowStagingWrites: true, write: () => {} }), /Set CRESTOVIA_ALLOW_STAGING_MUTATIONS/);
});

test('refuses production, non-HTTPS, and credentialed endpoints before sending tokens', async () => {
  for (const url of [
    'https://nnzxslnkpjlfbjmrvxaw.supabase.co',
    'http://xpwrsxmwqptrpwycibub.supabase.co',
    'https://user:pass@xpwrsxmwqptrpwycibub.supabase.co',
  ]) {
    await assert.rejects(() => runMutationAcceptance({ env: { ...env, CRESTOVIA_STAGING_SUPABASE_URL: url }, fixtures, allowStagingWrites: true, fetchImpl: async () => { throw new Error('must not send'); }, write: () => {} }), /restricted to the approved staging Supabase HTTPS host/);
  }
});

test('blocks cross-tenant updates and verifies the owner-visible fixture value is unchanged', async () => {
  const rows = new Map([[idA, 'synthetic-original'], [idB, 'synthetic-original']]);
  const calls = [];
  const result = await runMutationAcceptance({
    env, fixtures, allowStagingWrites: true, write: () => {},
    fetchImpl: async (url, init) => {
      const u = new URL(url);
      const token = init.headers.Authorization;
      calls.push({ method: init.method, token });
      const id = u.searchParams.get('id')?.slice(3);
      if (init.method === 'GET') {
        const own = (token === 'Bearer token-a' && id === idA) || (token === 'Bearer token-b' && id === idB);
        return { ok: true, status: 200, json: async () => own && rows.has(id) ? [{ id, description: rows.get(id) }] : [] };
      }
      if (init.method === 'PATCH') {
        const own = (token === 'Bearer token-a' && id === idA) || (token === 'Bearer token-b' && id === idB);
        if (own) rows.set(id, JSON.parse(init.body).description);
        return { ok: true, status: 204, json: async () => [] };
      }
      throw new Error('unexpected method');
    },
  });
  assert.deepEqual(result, { checks: 2, passed: 2, failed: 0, success: true });
  assert.ok(calls.some((call) => call.method === 'PATCH' && call.token === 'Bearer token-a'));
  assert.ok(calls.some((call) => call.method === 'PATCH' && call.token === 'Bearer token-b'));
  assert.equal(rows.get(idA), 'synthetic-original');
  assert.equal(rows.get(idB), 'synthetic-original');
});

test('detects a cross-tenant write if a mock policy incorrectly allows it and attempts restoration', async () => {
  const rows = new Map([[idA, 'synthetic-original'], [idB, 'synthetic-original']]);
  const result = await runMutationAcceptance({
    env, fixtures, allowStagingWrites: true, write: () => {},
    fetchImpl: async (url, init) => {
      const u = new URL(url), id = u.searchParams.get('id')?.slice(3), token = init.headers.Authorization;
      if (init.method === 'GET') return { ok: true, status: 200, json: async () => rows.has(id) ? [{ id, description: rows.get(id) }] : [] };
      if (init.method === 'PATCH') {
        rows.set(id, JSON.parse(init.body).description);
        return { ok: true, status: 204, json: async () => [] };
      }
      throw new Error('unexpected method');
    },
  });
  assert.equal(result.failed, 2);
  assert.equal(rows.get(idA), 'synthetic-original');
  assert.equal(rows.get(idB), 'synthetic-original');
});

test('does not disclose response bodies or bearer tokens in output', async () => {
  const output = [];
  const result = await runMutationAcceptance({
    env, fixtures, allowStagingWrites: true, write: (line) => output.push(line),
    fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({ message: 'sensitive provider detail' }) }),
  });
  assert.equal(result.failed, 2);
  assert.ok(!output.join('\n').includes('sensitive provider detail'));
  assert.ok(!output.join('\n').includes('token-a'));
});
