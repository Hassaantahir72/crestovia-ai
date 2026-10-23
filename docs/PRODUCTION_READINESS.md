# Crestovia AI — Production Readiness Gate

This checklist is the release gate for the private Crestovia AI deployment. A source-code merge or a green CI run is not proof that a live integration is configured correctly. Do not deploy publicly until the owner explicitly approves launch.

## Gate A — automated source and build checks

- [ ] API test workflow passes on the exact release commit.
- [ ] Web ESLint and Next.js production build pass on the exact release commit.
- [ ] Complete source archive is generated from that same commit and passes ZIP integrity checks.

**Current candidate evidence (v0.3.4, 2026-10-23):** the user reports that `scripts/validate-local.ps1` passed after syncing `chore/render-build-gates-api-service-v034` to the latest branch head. It reports 7/7 preflight tests, 5/5 deployment smoke-check tests, 5/5 backup-helper tests plus one Windows symlink test skipped due to OS permissions, 5/5 tenant-isolation runner tests, 5/5 provider-connectivity tests, 5/5 mocked Groq smoke tests, 3/3 AI guardrail tests, 3/3 readiness-report tests, successful checklist validation, zero ESLint errors with two warnings, TypeScript success, a successful Next.js production build with 22 generated pages, 107 passing API tests, and a successful Python compile check. The working tree was clean after validation. `apps/web/package-lock.json` is committed, and a clean `npm ci --ignore-scripts --no-audit --no-fund` install was previously reported successful locally. The Render blueprint now uses `npm ci --no-audit --no-fund` and pins the web service to Node 22.16.0 to match the declared engine range. This is user-reported local evidence, not an independently observed Render build. GitHub Actions workflow runs for the current candidate still report failure; inspect their job status/log availability before interpreting the cause. Keep Gate A checkboxes open until exact-commit remote checks or an equivalent approved release process and source archive integrity verification are complete.
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


## Latest CI blocker detail — 2026-10-22

- Latest retry confirmation at 2026-10-22 11:24 UTC: web run `39769401966` and API run `39769401968` both ended before any steps were recorded; job log retrieval again returned 404 (BlobNotFound). Root cause remains unknown. A further local npm install retry timed out, so the frontend build remains unverified.

- The latest web and API jobs failed before any workflow step ran: each job has no runner name, zero steps, and a two-second run window. Job-log retrieval returns 404 (BlobNotFound). Root cause is unknown; application code should not be changed speculatively to mask this infrastructure-level symptom.
- Local npm dependency installation fails at DNS resolution (`EAI_AGAIN registry.npmjs.org`), so current frontend lint and production build are not verified. Historical successful builds on earlier versions do not prove this candidate builds.
- Release Gate A remains unchecked until a fresh exact-commit workflow run completes, including lint and Next.js production build. Do not bypass CI or merge the stacked PRs while checks are failing.

## Local validation refresh — 2026-10-23

The user synced the current `chore/render-build-gates-api-service-v034` branch and reported a fresh successful run of `scripts/validate-local.ps1` on Windows (Node 24.22.1, npm 11.19.1, Python 3.12.0):

- Preflight tests: 7 passed.
- Deployment smoke-check tests: 5 passed.
- Backup helper tests: 5 passed, 1 skipped because Windows could not create symbolic links.
- Tenant-isolation acceptance runner tests: 5 passed.
- Provider connectivity tests: 5 passed.
- Mocked Groq smoke tests: 5 passed.
- AI guardrail tests: 3 passed.
- Readiness report tests: 3 passed; checklist structure validation passed.
- ESLint: passed with no warnings reported.
- TypeScript: passed.
- Next.js production build: passed; 22 static pages generated.
- API tests: 107 passed; one Starlette/httpx deprecation warning.
- Python compile check: passed.

The validation script explicitly states that these checks validate local code only; they do not verify production secrets, live tenant isolation, backups, or deployment. The run leaves `apps/web/tsconfig.tsbuildinfo` modified, a generated TypeScript build artifact; it should not be committed as a source change.

This newer local run supersedes the earlier local-validation details above for the candidate branch. It does not supersede the requirement for exact-commit remote build evidence, archive integrity verification, live acceptance tests, and owner launch approval.
