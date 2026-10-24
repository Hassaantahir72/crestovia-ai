#!/usr/bin/env node
/**
 * Explicitly opt-in, staging-only cross-tenant UPDATE acceptance test.
 * Fixtures must be synthetic rows with a harmless text probe column/value.
 * Every attempted unauthorized mutation is followed by an owner-token read;
 * if a mutation succeeds, the original value is restored before reporting failure.
 */
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const STAGING_HOST = 'xpwrsxmwqptrpwycibub.supabase.co';
const ALLOWED_TABLES = new Set([
  'departments', 'projects', 'tasks', 'task_comments', 'notifications',
  'assistant_conversations', 'assistant_memories', 'workspace_activity',
]);

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function isSafeText(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 200;
}

export function validateMutationFixtures(document) {
  if (!document || !Array.isArray(document.tables) || document.tables.length === 0) {
    throw new Error('Fixture file must contain a non-empty "tables" array.');
  }
  const seen = new Set();
  for (const [index, item] of document.tables.entries()) {
    if (!item || !PROBE_COLUMNS.has(item.table)) throw new Error('Fixture ' + (index + 1) + ' uses a table that is not mutation-allowlisted.');
    if (!isUuid(item.orgAId) || !isUuid(item.orgBId) || item.orgAId === item.orgBId) throw new Error('Fixture ' + (index + 1) + ' must contain two distinct UUID row IDs.');
    if (typeof item.probeColumn !== 'string' || !PROBE_COLUMNS.get(item.table).has(item.probeColumn)) throw new Error('Fixture ' + (index + 1) + ' has a probeColumn that is not allowlisted for this table.');
    if (!isSafeText(item.originalValue) || !isSafeText(item.attemptValue) || item.originalValue === item.attemptValue) {
      throw new Error('Fixture ' + (index + 1) + ' must provide distinct, non-empty text originalValue and attemptValue strings.');
    }
    for (const id of [item.orgAId, item.orgBId]) {
      const key = item.table + ':' + id;
      if (seen.has(key)) throw new Error('Fixture ' + (index + 1) + ' duplicates a table/row pair.');
      seen.add(key);
    }
  }
  return document.tables;
}

function makeUrl(baseUrl, table, id, column, filterValue) {
  const url = new URL('/rest/v1/' + table, baseUrl);
  url.searchParams.set('id', 'eq.' + id);
  url.searchParams.set('select', 'id,' + column);
  url.searchParams.set(column, 'eq.' + filterValue);
  return url;
}
function authHeaders(key, token, extra = {}) {
  return { apikey: key, Authorization: 'Bearer ' + token, Accept: 'application/json', ...extra };
}
async function readProbe({ baseUrl, key, token, fixture, id, fetchImpl }) {
  const url = new URL('/rest/v1/' + fixture.table, baseUrl);
  url.searchParams.set('select', 'id,' + fixture.probeColumn);
  url.searchParams.set('id', 'eq.' + id);
  const response = await fetchImpl(url, { method: 'GET', headers: authHeaders(key, token), signal: AbortSignal.timeout(10000), redirect: 'error' });
  if (!response.ok) throw new Error('Supabase returned HTTP ' + response.status + ' while reading a synthetic fixture.');
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Supabase returned an unexpected fixture response.');
  return rows.find((row) => row.id === id) ?? null;
}
async function patchProbe({ baseUrl, key, token, fixture, id, value, fetchImpl }) {
  const url = makeUrl(baseUrl, fixture.table, id, fixture.probeColumn, fixture.originalValue);
  const response = await fetchImpl(url, {
    method: 'PATCH',
    headers: authHeaders(key, token, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify({ [fixture.probeColumn]: value }),
    signal: AbortSignal.timeout(10000),
    redirect: 'error',
  });
  return response.ok;
}

export async function runMutationAcceptance({
  env = process.env, fixtures, allowStagingWrites = false, fetchImpl = fetch, write = console.log,
}) {
  if (!allowStagingWrites) throw new Error('Refusing to run mutations without the explicit --allow-staging-writes flag.');
  if (env.CRESTOVIA_ALLOW_STAGING_MUTATIONS !== 'YES_I_HAVE_SYNTHETIC_FIXTURES') {
    throw new Error('Set CRESTOVIA_ALLOW_STAGING_MUTATIONS=YES_I_HAVE_SYNTHETIC_FIXTURES only after confirming every fixture row is synthetic staging data.');
  }
  const baseUrl = env.CRESTOVIA_STAGING_SUPABASE_URL;
  const key = env.CRESTOVIA_STAGING_SUPABASE_PUBLISHABLE_KEY;
  const tokenA = env.CRESTOVIA_STAGING_ORG_A_USER_TOKEN;
  const tokenB = env.CRESTOVIA_STAGING_ORG_B_USER_TOKEN;
  if (!baseUrl || !key || !tokenA || !tokenB) throw new Error('Missing required staging settings. Set the four CRESTOVIA_STAGING_* variables privately.');
  let parsed;
  try { parsed = new URL(baseUrl); } catch { throw new Error('CRESTOVIA_STAGING_SUPABASE_URL must be a valid URL.'); }
  if (parsed.hostname !== STAGING_HOST || parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('Mutation acceptance is restricted to the approved staging Supabase HTTPS host.');
  }
  if (tokenA === tokenB) throw new Error('Org A and Org B must use different user access tokens.');
  const tableFixtures = validateMutationFixtures(fixtures);
  let checks = 0, passed = 0, failed = 0;
  for (const fixture of tableFixtures) {
    for (const attempt of [
      { actor: 'A', actorToken: tokenA, targetOrg: 'B', targetId: fixture.orgBId, ownerToken: tokenB },
      { actor: 'B', actorToken: tokenB, targetOrg: 'A', targetId: fixture.orgAId, ownerToken: tokenA },
    ]) {
      checks += 1;
      let original;
      try {
        original = await readProbe({ baseUrl: parsed.origin, key, token: attempt.ownerToken, fixture, id: attempt.targetId, fetchImpl });
        if (!original || original[fixture.probeColumn] !== fixture.originalValue) {
          failed += 1;
          write('FAIL table=' + fixture.table + ' target_org=' + attempt.targetOrg + ' reason=synthetic_fixture_missing_or_value_mismatch');
          continue;
        }
        const patchOk = await patchProbe({ baseUrl: parsed.origin, key, token: attempt.actorToken, fixture, id: attempt.targetId, value: fixture.attemptValue, fetchImpl });
        if (!patchOk) {
          failed += 1;
          write('FAIL table=' + fixture.table + ' target_org=' + attempt.targetOrg + ' reason=mutation_request_rejected_http');
          continue;
        }
        const after = await readProbe({ baseUrl: parsed.origin, key, token: attempt.ownerToken, fixture, id: attempt.targetId, fetchImpl });
        if (after && after[fixture.probeColumn] === fixture.originalValue) {
          passed += 1;
          write('PASS table=' + fixture.table + ' actor_org=' + attempt.actor + ' target_org=' + attempt.targetOrg + ' cross_tenant_update_blocked=true');
        } else {
          // Restore the synthetic row immediately if the unauthorized write took effect.
          const restoreOk = await patchProbe({ baseUrl: parsed.origin, key, token: attempt.ownerToken, fixture, id: attempt.targetId, value: fixture.originalValue, filterValue: fixture.attemptValue, fetchImpl });
          failed += 1;
          write('FAIL table=' + fixture.table + ' target_org=' + attempt.targetOrg + ' reason=unauthorized_update_changed_fixture restored=' + restoreOk);
        }
      } catch (error) {
        failed += 1;
        write('FAIL table=' + fixture.table + ' target_org=' + attempt.targetOrg + ' reason=request_error_' + (error?.name === 'TimeoutError' ? 'timeout' : 'unexpected'));
      }
    }
  }
  write('SUMMARY checks=' + checks + ' passed=' + passed + ' failed=' + failed + ' mode=staging-cross-tenant-update');
  write('LIMITATION: this runner checks cross-tenant UPDATE only; it does not prove INSERT/DELETE, role/suspension, stale-context, or approval replay safety.');
  return { checks, passed, failed, success: failed === 0 };
}

async function main() {
  const args = process.argv.slice(2);
  const index = args.indexOf('--fixtures');
  if (!args.includes('--allow-staging-writes') || index < 0 || !args[index + 1] || args.length !== 3) {
    throw new Error('Usage: CRESTOVIA_ALLOW_STAGING_MUTATIONS=YES_I_HAVE_SYNTHETIC_FIXTURES node scripts/tenant-isolation-mutation-acceptance.mjs --allow-staging-writes --fixtures path/to/staging-mutation-fixtures.json');
  }
  const fixtures = JSON.parse(await readFile(args[index + 1], 'utf8'));
  const result = await runMutationAcceptance({ fixtures, allowStagingWrites: true });
  if (!result.success) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('Tenant mutation acceptance stopped: ' + error.message);
    process.exitCode = 2;
  });
}
