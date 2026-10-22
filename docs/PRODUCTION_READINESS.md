# Crestovia AI — Production Readiness Gate

This checklist is the release gate for the private Crestovia AI deployment. A source-code merge or a green CI run is not proof that a live integration is configured correctly. Do not deploy publicly until the owner explicitly approves launch.

## Gate A — automated source and build checks

- [ ] API test workflow passes on the exact release commit.
- [ ] Web ESLint and Next.js production build pass on the exact release commit.
- [ ] Complete source archive is generated from that same commit and passes ZIP integrity checks.

**Current candidate evidence (v0.3.4, 2026-10-22):** offline web/security tests pass (39/39), API tests pass (107/107), the migration source-order check passes (36 files), and the local candidate ZIP integrity check passes. These checks do not replace an exact-commit CI run. GitHub Actions jobs currently fail before any steps are recorded, with no retrievable job logs. Local npm dependency installation failed because DNS resolution for `registry.npmjs.org` returned `EAI_AGAIN`; therefore ESLint and the Next.js production build have not been verified for this candidate. Do not mark these Gate A checks complete until they pass on the exact release commit.
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


## v0.2.98 staging acceptance evidence

The v0.2.98 source and web build workflows passed on the release merge commit. Staging database acceptance is recorded separately from production launch authorization.

- **Release commit:** `2db9946f093763eaeb2dcd8c7284f58893a9dece` (v0.2.98; main)
- **API tests:** [successful workflow run](https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39754326941)
- **Web lint and production build:** [successful workflow run](https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39754326771)
- **Source archive packaging and secret-pattern verification:** [successful workflow run](https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39754326746)
- **Staging project:** `crestovia-ai-staging` (`xpwrsxmwqptrpwycibub`); migrations 0001–0036 applied.
- **Effective schema privileges:** `anon` has no USAGE on schema `public`; `authenticated` and `service_role` retain USAGE.
- **RLS / table grants:** all 21 public tables have RLS enabled; no table has RLS disabled; no effective anonymous table DML grants remain.
- **Security advisor:** no findings.
- **Known limitation:** platform-managed `supabase_admin` default ACL entries remain unchanged. The schema boundary blocks anonymous access unless schema USAGE is later re-granted; re-audit after future role/schema changes.

This does **not** complete the live tenant-isolation, provider, backup/restore, or launch-authorization gates. Production remains at migration 0033 and was not changed by staging acceptance. Keep public deployment disabled until the remaining gates are evidenced and the owner explicitly approves launch.


## Historical verified evidence log (v0.2.97)

The following Gate A items are checked only because their workflows completed successfully on the exact v0.2.97 release source commit recorded below.

- **Release commit:** `6f0f24a36aa28f7a5f2dedb36dfffd2f90e498ba` (v0.2.97; main)
- **API tests:** [successful workflow run](https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39744623714)
- **Web lint and production build:** [successful workflow run](https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39744623697)
- **Source archive packaging and content/credential-pattern verification:** [successful workflow run](https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39744623706)
- **Downloaded archive SHA-256:** `e71ea1e08ea7a08d3fad7fda7ec427be0b13c1f621be2dc229f33cac194c19c5` (214 entries; ZIP integrity and embedded archive verification passed; package version 0.2.97)

This evidence log does not assert that live database security, tenant isolation, provider acceptance, recovery, or launch authorization is complete.


## Live environment verification refresh (2026-10-22)

- Read-only Supabase security advisors returned no findings in staging or production. Informational unused-index notices remain (46 staging, 47 production); these are not sufficient evidence to remove indexes.
- Staging migration inventory is at 0036; production remains at 0033. No production migration or write was performed.
- Latest GitHub Actions reruns again failed before recording any steps, with no retrievable job logs. The root cause remains unconfirmed.
- Local npm installation timed out; candidate ESLint and Next.js production build remain unverified. Gate A stays unchecked.
- The connected Render workspace has no service linked to the Crestovia AI repository, so no Crestovia app deployment was found there. No service was created or deployed.
