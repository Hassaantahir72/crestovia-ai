import test from 'node:test';
import assert from 'node:assert/strict';
import { checkProvider, runProviderChecks } from './provider-connectivity-check.mjs';

const providers = [
  { name: 'groq', envName: 'GROQ_API_KEY', url: 'https://api.groq.com/openai/v1/models' },
  { name: 'resend', envName: 'RESEND_API_KEY', url: 'https://api.resend.com/domains' },
];

test('reports missing credentials without making requests', async () => {
  let calls = 0;
  const result = await checkProvider(providers[0], { env: {}, fetchImpl: async () => { calls += 1; } });
  assert.deepEqual(result, { provider: 'groq', status: 'missing_configuration' });
  assert.equal(calls, 0);
});

test('uses only GET to fixed HTTPS endpoints and never prints credentials', async () => {
  const secret = 'never-print-this-token';
  const calls = [], output = [];
  const result = await runProviderChecks({
    env: { GROQ_API_KEY: secret, RESEND_API_KEY: 'resend-secret' },
    write: (line) => output.push(line),
    fetchImpl: async (url, init) => {
      calls.push({ url, method: init.method, auth: init.headers.Authorization, redirect: init.redirect });
      return { ok: true, status: 200 };
    },
  });
  assert.deepEqual(result, { connected: 2, total: 2, success: true });
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.method === 'GET' && call.redirect === 'error'));
  assert.ok(calls.every((call) => call.url.startsWith('https://')));
  assert.ok(!output.join('\n').includes(secret));
  assert.ok(!output.join('\n').includes('resend-secret'));
});

test('distinguishes rejected credentials from provider errors', async () => {
  const auth = await checkProvider(providers[0], { env: { GROQ_API_KEY: 'secret' }, fetchImpl: async () => ({ ok: false, status: 401 }) });
  const server = await checkProvider(providers[1], { env: { RESEND_API_KEY: 'secret' }, fetchImpl: async () => ({ ok: false, status: 503 }) });
  assert.deepEqual(auth, { provider: 'groq', status: 'authentication_rejected', httpStatus: 401 });
  assert.deepEqual(server, { provider: 'resend', status: 'provider_error', httpStatus: 503 });
});

test('does not print provider response bodies or raw network errors', async () => {
  const output = [];
  const result = await runProviderChecks({
    env: { GROQ_API_KEY: 'secret-a', RESEND_API_KEY: 'secret-b' },
    write: (line) => output.push(line),
    fetchImpl: async () => { throw new Error('network failure leaked secret-a'); },
  });
  assert.equal(result.success, false);
  assert.ok(output.every((line) => !line.includes('secret-a') && !line.includes('network failure')));
});

test('reports timeout without leaking the thrown error', async () => {
  const result = await checkProvider(providers[0], {
    env: { GROQ_API_KEY: 'secret' },
    fetchImpl: async () => { const error = new Error('timed out'); error.name = 'TimeoutError'; throw error; },
  });
  assert.deepEqual(result, { provider: 'groq', status: 'timeout' });
});
