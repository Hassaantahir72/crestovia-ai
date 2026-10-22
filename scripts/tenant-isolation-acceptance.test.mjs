import test from 'node:test';
import assert from 'node:assert/strict';
import { runAcceptance, validateFixtureDocument } from './tenant-isolation-acceptance.mjs';

const idA = '11111111-1111-4111-8111-111111111111';
const idB = '22222222-2222-4222-8222-222222222222';
const fixtures = { tables: [{ table: 'projects', orgAId: idA, orgBId: idB }] };
const env = {
  CRESTOVIA_STAGING_SUPABASE_URL: 'https://xpwrsxmwqptrpwycibub.supabase.co',
  CRESTOVIA_STAGING_SUPABASE_PUBLISHABLE_KEY: 'public-test-key',
  CRESTOVIA_STAGING_ORG_A_USER_TOKEN: 'token-a',
  CRESTOVIA_STAGING_ORG_B_USER_TOKEN: 'token-b',
};

test('accepts only allowlisted tables and distinct UUID fixtures', () => {
  assert.equal(validateFixtureDocument(fixtures).length, 1);
  assert.throws(() => validateFixtureDocument({ tables: [{ ...fixtures.tables[0], table: 'email_delivery_attempts' }] }), /not allowlisted/);
  assert.throws(() => validateFixtureDocument({ tables: [{ ...fixtures.tables[0], orgBId: idA }] }), /two distinct UUID/);
  assert.throws(() => validateFixtureDocument({ tables: [] }), /non-empty/);
});

test('checks own-tenant and foreign-tenant reads using GET only', async () => {
  const calls = [], output = [];
  const result = await runAcceptance({
    env, fixtures, write: (line) => output.push(line),
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), method: init.method, authorization: init.headers.Authorization });
      const actorA = init.headers.Authorization === 'Bearer token-a';
      const targetA = new URL(url).searchParams.get('id') === 'eq.' + idA;
      const visible = actorA === targetA;
      return { ok: true, status: 200, json: async () => visible ? [{ id: targetA ? idA : idB }] : [] };
    },
  });
  assert.deepEqual(result, { checks: 4, passed: 4, failed: 0, success: true });
  assert.equal(calls.length, 4);
  assert.ok(calls.every((call) => call.method === 'GET'));
  assert.ok(output.some((line) => line.includes('LIMITATION:')));
  assert.ok(!output.join('\n').includes('token-a'));
});

test('fails closed on missing settings and identical actor tokens', async () => {
  await assert.rejects(() => runAcceptance({ env: {}, fixtures, write: () => {} }), /Missing required staging settings/);
  await assert.rejects(() => runAcceptance({ env: { ...env, CRESTOVIA_STAGING_ORG_B_USER_TOKEN: 'token-a' }, fixtures, write: () => {} }), /different user access tokens/);
});

test('rejects non-HTTPS and non-Supabase remote endpoints before sending tokens', async () => {
  await assert.rejects(() => runAcceptance({ env: { ...env, CRESTOVIA_STAGING_SUPABASE_URL: 'http://xpwrsxmwqptrpwycibub.supabase.co' }, fixtures, write: () => {} }), /must use the approved staging project HTTPS host/);
  await assert.rejects(() => runAcceptance({ env: { ...env, CRESTOVIA_STAGING_SUPABASE_URL: 'https://attacker.example' }, fixtures, write: () => {} }), /must use the approved staging project HTTPS host/);
});

test('does not expose provider response bodies when a request fails', async () => {
  const output = [];
  const result = await runAcceptance({
    env, fixtures, write: (line) => output.push(line),
    fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ message: 'secret database details' }) }),
  });
  assert.equal(result.failed, 4);
  assert.ok(output.every((line) => !line.includes('secret database details')));
});
