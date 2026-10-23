# Six-gate release execution

This guide connects Crestovia AI's six formal release gates to repeatable source checks and the remaining live acceptance work.

## Automated source preflight

Run from the repository root:

```sh
node scripts/release-gates-preflight.mjs
node --test scripts/release-gates-preflight.test.mjs
```

The preflight verifies that each gate's required implementation, test, or operational document exists; validates the formal A–F checklist structure; and confirms owner launch approval remains unchecked. CI runs this before release readiness is reviewed.

A passing result means the source artifacts are present. It does **not** mean that live credentials work, tenant boundaries have passed against staging, email has reached a real inbox, the cron scheduler has run, or a database restore succeeded.

## Gate-by-gate execution

### Gate A — source and production build
- Run web CI (locked dependency install, regression tests, preflight, lint, TypeScript, and Next.js production build).
- Run API CI and migration validation.
- Generate the source archive from the exact candidate commit and verify archive integrity and secret-pattern checks.
- Preserve the CI run and archive checksum as release evidence.

### Gate B — organization and role isolation
- Use the read-only tenant acceptance runner with two dedicated staging users and synthetic fixtures.
- Run the approval RPC regression test to guard organization binding, current owner membership, expiry, status, and single-execution checks.
- Extend manual tests across owners, managers, members, suspended memberships, a dual-organization user, and direct read/mutation attempts.
- Run the read-only staging SQL audit and require zero findings for public-table RLS/grants, anon schema/function access, and reminder RPC grants.
- Verify effective RLS, schema/table/function grants, and approval RPC behavior in staging. Do not use production fixtures.

### Gate C — Company AI and Groq
- Run mocked provider guardrail tests in CI.
- In the deployed test environment, run the Groq smoke check with the key supplied through the hosting platform's private environment settings.
- Test invalid credentials, timeout, rate limiting, malformed responses, and assistant organization scope.
- Never print or copy the key, authorization header, or raw provider diagnostics into logs.

### Gate D — email and reminders
- Run API webhook and cron guardrail tests.
- Verify Resend signature rejection, bounded request parsing, duplicate-event behavior, and unmatched-event reconciliation.
- With synthetic staging tasks, exercise the authenticated reminder route repeatedly and confirm dedupe, batch limits, and organization scope.
- Send one authorized test email and confirm delivery through the provider dashboard/webhook ledger.

### Gate E — recovery and operations
- Confirm the current Supabase backup/PITR retention for the selected plan.
- Validate a securely stored custom-format backup using the backup helper.
- Complete a restore drill into a separate non-production target; record recovery point, duration, schema/RLS/grant checks, and application smoke results.
- Confirm rollback, incident response, credential rotation, and alerting procedures.

### Gate F — launch authorization
- Review the six-gate report and the evidence for every required live check.
- Record known limitations and who accepted them.
- Keep launch authorization unchecked until the owner explicitly approves deployment. This script cannot provide that approval.

## Safety boundaries

The source preflight performs no network requests, does not read environment variable values, and does not mutate databases or hosting settings. No production migration, Auth setting change, repository visibility change, merge, or deployment is initiated by these checks.
