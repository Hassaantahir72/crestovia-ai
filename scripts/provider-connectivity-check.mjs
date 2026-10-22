#!/usr/bin/env node
/** Read-only connectivity checks for configured external providers. Never sends mail. */
import { pathToFileURL } from 'node:url';

const PROVIDERS = [
  { name: 'groq', envName: 'GROQ_API_KEY', url: 'https://api.groq.com/openai/v1/models', description: 'Groq model-list endpoint' },
  { name: 'resend', envName: 'RESEND_API_KEY', url: 'https://api.resend.com/domains', description: 'Resend domains endpoint' },
];

export async function checkProvider(provider, { env = process.env, fetchImpl = fetch } = {}) {
  const token = env[provider.envName];
  if (!token) return { provider: provider.name, status: 'missing_configuration' };
  try {
    const response = await fetchImpl(provider.url, {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) return { provider: provider.name, status: 'connected', httpStatus: response.status };
    if (response.status === 401 || response.status === 403) {
      return { provider: provider.name, status: 'authentication_rejected', httpStatus: response.status };
    }
    return { provider: provider.name, status: 'provider_error', httpStatus: response.status };
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      return { provider: provider.name, status: 'timeout' };
    }
    return { provider: provider.name, status: 'network_or_tls_error' };
  }
}

export async function runProviderChecks({ env = process.env, fetchImpl = fetch, write = console.log } = {}) {
  let passed = 0;
  for (const provider of PROVIDERS) {
    const result = await checkProvider(provider, { env, fetchImpl });
    const extra = result.httpStatus ? ' http=' + result.httpStatus : '';
    write(result.provider.toUpperCase() + ': ' + result.status + extra);
    if (result.status === 'connected') passed += 1;
  }
  write('SUMMARY connected=' + passed + '/' + PROVIDERS.length);
  write('SAFETY: read-only GET requests only; no email sent; credentials and response bodies are never printed.');
  return { connected: passed, total: PROVIDERS.length, success: passed === PROVIDERS.length };
}

async function main() {
  const result = await runProviderChecks();
  if (!result.success) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    console.error('Provider checks stopped unexpectedly; no credential or response details were logged.');
    process.exitCode = 2;
  });
}
