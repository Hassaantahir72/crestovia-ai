# Organization isolation acceptance checklist

Crestovia AI relies on Supabase row-level security as the database authorization boundary. Explicit organization and user predicates in application queries are defense in depth; source-level checks are not proof of live RLS isolation.

## Automated regression guardrails

The API CI suite checks that:
- Read-only assistant workspace queries include the active organization ID, keep assigned-task reads scoped to the signed-in user, remain read-only, and retain result bounds.
- Notification read-state mutations bind both the recipient and active organization.
- Approved task execution passes the active organization to the atomic database RPC instead of inserting a task directly from application code.


## Read-only staging runner

A read-only live check is available at `scripts/tenant-isolation-acceptance.mjs`. It calls Supabase REST with two distinct, user-scoped access tokens and verifies that each actor can read its own synthetic fixture row while the other organization's fixture row is hidden by RLS. It is an additional signal, not a substitute for the full UI/server-action acceptance matrix above.

1. In the staging Supabase project only, create two synthetic organizations and dedicated test users. Create one visible fixture row per organization for each table under test. Do not use production IDs or production accounts.
2. Copy `docs/security/tenant-isolation-fixtures.example.json` to a private local file outside the repository and replace every example UUID with the corresponding synthetic row ID. Use only tables supported by the runner allowlist.
3. Sign in as each test user through the normal application or Supabase Auth flow and obtain each user's short-lived access token through a trusted local workflow. Configure these variables in the local shell or secret manager; never commit them or paste them into chat: `CRESTOVIA_STAGING_SUPABASE_URL`, `CRESTOVIA_STAGING_SUPABASE_PUBLISHABLE_KEY`, `CRESTOVIA_STAGING_ORG_A_USER_TOKEN`, and `CRESTOVIA_STAGING_ORG_B_USER_TOKEN`. The two tokens must belong to different users.
4. Run `node scripts/tenant-isolation-acceptance.mjs --fixtures /private/path/tenant-fixtures.json`. The runner only issues GET requests, limits table names to an explicit allowlist, uses HTTPS for remote endpoints, and does not print tokens, row IDs, or response bodies. A zero exit code means the configured read cases matched expectations.
5. Keep the result with the private acceptance worksheet and then continue with mutation, stale-context, suspended-membership, role, and approval replay tests below.

The runner deliberately does **not** create or modify fixtures, and it cannot prove application server-action authorization. Its read-only scope is a safety property, not a claim that the full tenant-isolation gate is complete.

## Required live acceptance test

Use two separate organizations and at least three accounts (owner, ordinary member, and suspended/inactive member). Do not use production customer data.

1. Create distinct projects, tasks, approval requests, notifications, and assistant conversations in organization A and B.
2. Sign in as each role in organization A; confirm no list, detail, search, assistant context, notification, or mutation exposes organization B records.
3. Repeat in organization B, including an owner who belongs to both organizations if supported.
4. Attempt cross-organization IDs directly against read and mutation endpoints; expect denial or an empty result without revealing whether the foreign record exists.
5. Confirm suspended memberships cannot use workspace routes or mutate records after suspension.
6. Confirm approval execution fails for a request belonging to another organization, an expired request, a non-owner, and a request that has already executed.
7. Confirm notification read actions cannot mark another user's notification as read.
8. Capture outcomes and relevant request IDs without storing secrets or private content.

## Release gate

Do not treat this checklist or static pytest assertions as live acceptance. Record test accounts, environment, expected result, observed result, and date in a private report. Public deployment remains deferred until the owner approves it.
