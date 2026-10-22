# Crestovia AI — Production Readiness Gate

This checklist is the release gate for the private Crestovia AI deployment. A source-code merge or a green CI run is not proof that a live integration is configured correctly. Do not deploy publicly until the owner explicitly approves launch.

## Gate A — automated source and build checks

- [x] API test workflow passes on the exact release commit.
- [x] Web ESLint and Next.js production build pass on the exact release commit.
- [x] Complete source archive is generated from that same commit and passes ZIP integrity checks.
- [ ] Database migrations are reviewed, applied to the intended environment, and their grants/policies verified.
- [ ] No secrets, tokens, local environment files, or production data are included in the source archive.

## Gate B — organization and role isolation

Use two separate organizations and at least an owner, an administrator/manager, and a regular member in each organization.

- [ ] Organization A users cannot read or mutate Organization B projects, tasks, departments, conversations, notifications, approvals, audit records, or membership details.
- [ ] A user who belongs to both organizations sees only the currently selected organization’s records and cannot reuse stale organization context.
- [ ] Suspended or revoked memberships cannot access organization resources or execute approvals.
- [ ] Approval execution uses the approved request’s organization and rechecks current membership/authorization atomically.
- [ ] Read, create, update, delete, and export paths are tested, including direct API requests rather than only UI navigation.
- [ ] RLS policies and RPC execute grants are checked in the live database; source-level tests alone are insufficient.

## Gate C — AI provider

- [ ] A valid Groq configuration completes a real assistant request.
- [ ] Missing, invalid, timed-out, rate-limited, and provider-error responses fail safely without leaking keys or internal diagnostics.
- [ ] Assistant memory and workspace tools are scoped to the active user and organization.
- [ ] Read-only tool calls remain read-only; consequential actions require explicit approval.
- [ ] Provider limits and user-visible error states are exercised with real accounts.

## Gate D — email and reminders

- [ ] Resend connection diagnostic succeeds only for an authorized owner and respects its shared rate limits.
- [ ] A real message delivery is recorded; signed webhook events are accepted, duplicate events remain idempotent, and unmatched events reconcile after delivery records exist.
- [ ] Invalid signatures, stale timestamps, oversized payloads, and unauthorized requests are rejected.
- [ ] Cron endpoint is configured with a strong private secret in the hosting platform, and unauthenticated calls are rejected.
- [ ] Reminder schedule, timezone behavior, bounded scan sizes, duplicate suppression, failures, and recovery after a missed run are tested.
- [ ] Monitoring alerts identify repeated cron failures and email delivery failures without exposing sensitive payloads.

## Gate E — recovery and operations

- [ ] Database backup/PITR availability and retention are confirmed for the chosen Supabase plan.
- [ ] A restore drill into a non-production environment has been completed and documented.
- [ ] Rollback procedure identifies the last known-good application commit and safe database migration strategy.
- [ ] Logs and alerts are available for application errors, provider failures, cron failures, and database errors.
- [ ] Incident contacts, credential rotation steps, and a process for revoking compromised sessions are documented.

## Gate F — launch authorization

- [ ] All applicable checks above have evidence and an owner.
- [ ] Remaining known limitations are reviewed and accepted.
- [ ] The owner explicitly approves public deployment.

**Current state:** Not release-ready by assertion. Automated checks can pass while live-account acceptance, provider setup, recovery drills, and launch authorization remain outstanding. Keep deployment private until the gates are completed.


## Verified evidence log

The following Gate A items are checked only because their workflows completed successfully on the exact merged release commit.

- **Release commit:** `c5ae088d72d143cead8b444de4518754b50a8575` (v0.2.85)
- **API tests:** [successful workflow run](https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39724575004)
- **Web lint and production build:** [successful workflow run](https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39724575017)
- **Source archive packaging and content/credential-pattern verification:** [successful workflow run](https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39724575052)
- **Downloaded archive SHA-256:** `48af23dce118a8318c8bc2ff6d6f2a7981470b79ffc5c3450e06a5c6566ec772` (208 entries; ZIP integrity passed; package version 0.2.85)

This evidence log does not assert that live database security, tenant isolation, provider acceptance, recovery, or launch authorization is complete.
