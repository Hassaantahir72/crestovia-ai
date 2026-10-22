#!/usr/bin/env node
/** Read-only tenant-isolation acceptance runner for synthetic staging fixtures. */
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const TENANT_TABLE_ALLOWLIST = new Set([
  'organizations', 'memberships', 'departments', 'projects', 'project_memberships',
  'tasks', 'task_comments', 'notifications', 'assistant_conversations',
  'assistant_messages', 'assistant_memories', 'action_approval_requests',
  'audit_logs', 'workspace_activity',
]);

function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function validateFixtureDocument(document) {
  if (!document || !Array.isArray(document.tables) || document.tables.length === 0) {
    throw new Error('Fixture file must contain a non-empty "tables" array.');
  }
  const seen = new Set();
  for (const [index, item] of document.tables.entries()) {
    if (!item || !TENANT_TABLE_ALLOWLIST.has(item.table)) {
      throw new Error('Fixture ' + (index + 1) + ' uses a table that is not allowlisted.');
    }
    if (!isUuid(item.orgAId) || !isUuid(item.orgBId) || item.orgAId === item.orgBId) {
      throw new Error('Fixture ' + (index + 1) + ' must contain two distinct UUID row IDs.');
    }
    for (const id of [item.orgAId, item.orgBId]) {
      const key = item.table + ':' + id;
      if (seen.has(key)) throw new Error('Fixture ' + (index + 1) + ' duplicates a table/row pair.');
      seen.add(key);
    }
  }
  return document.tables;
}

async function checkRow({ baseUrl, publishableKey, token, table, id, expectedVisible, fetchImpl }) {
  const url = new URL('/rest/v1/' + table, baseUrl);
  url.searchParams.set('select', 'id');
  url.searchParams.set('id', 'eq.' + id);
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { apikey: publishableKey, Authorization: 'Bearer ' + token, Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Supabase returned HTTP ' + response.status + ' while checking ' + table + '.');
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Supabase returned an unexpected response for ' + table + '.');
  const visible = rows.length > 0;
  return { passed: visible === expectedVisible, visible };
}

export async function runAcceptance({ env = process.env, fixtures, fetchImpl = fetch, write = console.log }) {
  const baseUrl = env.CRESTOVIA_STAGING_SUPABASE_URL;
  const publishableKey = env.CRESTOVIA_STAGING_SUPABASE_PUBLISHABLE_KEY;
  const tokenA = env.CRESTOVIA_STAGING_ORG_A_USER_TOKEN;
  const tokenB = env.CRESTOVIA_STAGING_ORG_B_USER_TOKEN;
  if (!baseUrl || !publishableKey || !tokenA || !tokenB) {
    throw new Error('Missing required staging settings. Set the four CRESTOVIA_STAGING_* variables privately.');
  }
  let parsedUrl;
  try { parsedUrl = new URL(baseUrl); } catch { throw new Error('CRESTOVIA_STAGING_SUPABASE_URL must be a valid URL.'); }
  if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost') {
    throw new Error('Staging Supabase URL must use HTTPS (localhost is allowed for local tests).');
  }
  if (tokenA === tokenB) throw new Error('Org A and Org B must use different user access tokens.');
  const tableFixtures = validateFixtureDocument(fixtures);
  let passed = 0, failed = 0, checks = 0;
  for (const fixture of tableFixtures) {
    for (const actor of ['A', 'B']) {
      const token = actor === 'A' ? tokenA : tokenB;
      for (const org of ['A', 'B']) {
        const id = org === 'A' ? fixture.orgAId : fixture.orgBId;
        const expectedVisible = actor === org;
        checks += 1;
        try {
          const result = await checkRow({ baseUrl: parsedUrl.origin, publishableKey, token, table: fixture.table, id, expectedVisible, fetchImpl });
          if (result.passed) {
            passed += 1;
            write('PASS actor=' + actor + ' table=' + fixture.table + ' target_org=' + org + ' visible=' + result.visible);
          } else {
            failed += 1;
            write('FAIL actor=' + actor + ' table=' + fixture.table + ' target_org=' + org + ' expected_visible=' + expectedVisible + ' actual_visible=' + result.visible);
          }
        } catch (error) {
          failed += 1;
          write('FAIL actor=' + actor + ' table=' + fixture.table + ' target_org=' + org + ' request_error=' + error.message);
        }
      }
    }
  }
  write('SUMMARY checks=' + checks + ' passed=' + passed + ' failed=' + failed + ' mode=read-only');
  write('LIMITATION: this runner does not test mutations, server actions, roles, stale organization context, suspension, or approval replay.');
  return { checks, passed, failed, success: failed === 0 };
}

async function main() {
  const args = process.argv.slice(2);
  const index = args.indexOf('--fixtures');
  if (index < 0 || !args[index + 1] || args.length !== 2) {
    throw new Error('Usage: node scripts/tenant-isolation-acceptance.mjs --fixtures path/to/staging-fixtures.json');
  }
  const fixtures = JSON.parse(await readFile(args[index + 1], 'utf8'));
  const result = await runAcceptance({ fixtures });
  if (!result.success) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('Tenant-isolation acceptance stopped: ' + error.message);
    process.exitCode = 2;
  });
}
