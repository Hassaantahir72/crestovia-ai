## Current build status — v0.3.5 (PR validation in progress)

- Package version `0.3.5` introduces the opt-in WhatsApp Cloud API webhook ingress and executable security-helper tests.
- CI must pass API tests, web regression tests, ESLint, TypeScript, and Next.js production build before merge to the Render-tracked branch.
- Live Meta/n8n setup and runtime acceptance are not complete; no production secrets, database settings, or live service configuration were changed.

## Hands-on validation refresh — 2026-10-22 18:20 PKT

- Re-ran the offline JavaScript test suite: 39 passed, 0 failed.
- Re-ran the API pytest suite: 107 passed, 0 failed.
- Migration source sequence check passed for 36 migrations (0001–0036); this is a source-order check, not a live database migration audit.
- Readiness checklist structure passed (six gates, 30 items); release readiness remains blocked by pending real-world evidence.
- Re-ran Python bytecode compilation successfully for the API and migration-check script.
- Tried frontend dependency installation again; npm timed out, and offline install confirmed required package metadata is not cached. No package lockfile is present, so a reproducible frontend install is not yet available.
- Ran the globally available TypeScript compiler as a diagnostic only. It cannot resolve Next.js, React, Node, or Supabase packages because dependencies are absent. It surfaced no syntax diagnostics, and rate-limit guard flags plus approved-email payload narrowing were hardened, but this is **not** a successful frontend typecheck, ESLint run, or Next.js build.
- GitHub Actions latest API/web jobs still fail before workflow steps and have no downloadable logs. The runner/setup root cause remains unconfirmed; owner review of repository Actions settings/usage is needed if it persists.
- No live Groq call was made because the key previously pasted into chat must be revoked. No replacement key is available privately in this environment. No staging users/tokens were available for real tenant-isolation acceptance. No production database writes or deployment were performed.



## CI / dependency blocker detail — 2026-10-22 11:24 UTC

- Latest Validate Web App run: https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39769401966. Latest Validate API run: https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39769401968.
- A fresh inspection again shows both jobs failed before any workflow step ran; job metadata has no runner name, no steps, and no downloadable log content (GitHub log retrieval returns 404 / BlobNotFound). The underlying cause remains unconfirmed; this does not identify an application-code failure. Do not alter app code speculatively to mask this symptom.
- A repeated local `npm install --no-audit --no-fund` attempt timed out in this environment after the earlier DNS resolution error (`EAI_AGAIN registry.npmjs.org`) while fetching `@supabase/ssr`. Dependencies could not be confirmed installed. ESLint and Next production build remain unverified.
- Independent re-run on this candidate: Node 39/39 and API pytest 107/107 passed; migration source-order check covers 36 migrations (0001–0036). These do not replace the blocked frontend build.
- Required next action: repository owner should inspect GitHub Actions settings/usage limits and retry once runner assignment works. Do not disable CI checks to manufacture a green result.

## Live verification refresh — 2026-10-22 11:06 UTC

- Re-ran source archive tests from the cumulative candidate: Node web/security suite **39/39 passed**; API pytest **107/107 passed**; migration source-order check passed for **36 files (0001–0036)**; ZIP integrity/path/environment/credential-pattern verification passed.
- Read-only Supabase advisor check: staging (xpwrsxmwqptrpwycibub) and production (nnzxslnkpjlfbjmrvxaw) both report **zero security findings**. Performance advisors report informational unused-index notices (46 staging, 47 production); no indexes were removed.
- Migration inventory confirms staging through migration 0036 and production through migration 0033. No migration or production database write was made.
- GitHub Actions rerun requests were accepted, but both jobs again completed as failures with no recorded steps and no retrievable logs. The cause is still unconfirmed; no speculative workflow/runner change was made.
- A fresh local npm install attempt timed out. ESLint and the Next.js production build remain unverified for this candidate.
- The connected Render workspace currently lists services for other repositories, not Hassaantahir72/crestovia-ai; no Crestovia deployment is configured in that workspace. No service was created and nothing was deployed.

## Crestovia AI — Current Build Status (2026-10-22)

**Project version:** 0.3.4 (candidate; CI verification pending)
**Baseline:** v0.3.3 Groq smoke-check branch; PR #84 remains open pending workflow investigation.
**Milestone:** Real assistant-provider resilience.
**Change:** Live assistant requests now have a 20-second timeout, blocked redirects, model identifier validation, and safe timeout/malformed-response errors. The owner diagnostic remains limited to 10 seconds.
**Database:** no migration or database change. Staging remains at migration 0036; production remains at migration 0033.
**Deployment:** no public deployment; owner approval remains required.

### Validation refresh (2026-10-22)
- Re-run offline web/security suite: 39 passed, 0 failed.
- Re-run API suite: 107 passed, 0 failed.
- Migration source-order check: 36 files, 0001–0036; this is not live database validation.
- GitHub Actions failed jobs expose no steps and their logs are unavailable through the current GitHub API response; root cause remains unknown.
- npm registry lookup failed with DNS `EAI_AGAIN`, so ESLint and Next.js production build remain unverified for this candidate.

### Current release blockers
1. Diagnose GitHub Actions jobs failing before steps run; verify PR #84 and this increment before merging.
2. Run tenant-isolation acceptance with two synthetic staging users, then complete mutation, role, stale-context, suspension, and approval-replay tests.
3. Run the Groq smoke check with a privately configured staging key, then test the app real assistant flow. Verify Resend delivery/webhooks, reminders, duplicate suppression, and failure recovery with approved fixtures.
4. Confirm backup retention and complete an isolated non-production restore drill.
5. Re-audit effective schema/object privileges after schema or role changes; the platform-managed default-ACL limitation remains documented.
6. Collect release evidence and obtain explicit owner approval before public deployment.

---

## Crestovia AI — Current Build Status (2026-10-22)

**Project version:** 0.3.3 (candidate; CI verification pending)
**Baseline:** v0.3.2 / merge commit `59b84f7e1defbbb11b77c2dc6a3ee55ec0e9a8e3`
**Milestone:** Opt-in live Groq completion smoke check
**Change:** Adds a real, bounded operator-side completion request using a private `GROQ_API_KEY`; response content and credentials are never printed. Mocked CI tests cover safe failure categories.
**Database:** no migration or database change. Staging remains at migration 0036; production remains at migration 0033.
**Deployment:** no public deployment; owner approval remains required.

### Current release blockers
1. Run tenant-isolation acceptance with two synthetic staging users, then complete mutation, role, stale-context, suspension, and approval-replay tests.
2. Run the Groq smoke check with a privately configured staging key, then test the app's real assistant flow. Verify Resend delivery/webhooks, reminders, duplicate suppression, and failure recovery with approved fixtures.
3. Confirm backup retention and complete an isolated non-production restore drill.
4. Re-audit effective schema/object privileges after schema or role changes; the platform-managed default-ACL limitation remains documented.
5. Collect release evidence and obtain explicit owner approval before public deployment.

---

## Crestovia AI — Current Build Status (2026-10-22)

**Project version:** 0.3.2 (provider connectivity diagnostics candidate)
**Milestone:** Read-only provider connectivity checks for Groq and Resend
**Change:** Adds fixed-endpoint HTTPS GET checks, safe status reporting, offline tests, CI coverage, and an operator runbook. The checks never send email or print secrets.
**Verification:** Provider tests and web CI/build are pending for this candidate; API suite is unchanged.
**Database:** no migration applied. Staging remains at migration 0036; production remains at migration 0033.
**GitHub:** changes are on a feature branch and awaiting CI/review; not merged.
**Deployment:** no public deployment; owner approval remains required.

### Remaining release blockers
1. Run tenant-isolation checks with two real synthetic staging users; complete mutation/server-action tests, stale organization context, suspended memberships, role boundaries, and approval replay.
2. Run provider connectivity diagnostics with privately configured staging credentials, then verify Groq completions, Resend delivery/webhooks, scheduled reminders, duplicate suppression, and failure recovery end-to-end.
3. Confirm backup retention and complete a non-production restore drill.
4. Re-audit effective schema/object privileges after schema or role changes; resolve or formally accept the platform-managed default-ACL limitation.
5. Collect remaining readiness evidence and obtain explicit owner approval before public deployment.

---

## Crestovia AI — Current Build Status (2026-10-22)

**Project version:** 0.2.99 (PR #80 merged; API and web CI passed)
**Release commit:** `e580ffa558702a409217f64e296bc54593f34d56`
**Milestone:** Dashboard navigation cleanup
**Change:** Removed the duplicate Notifications shortcut and added a regression test.
**Verification:** API CI passed (105 tests in the source archive verification run); web preflight, helper tests, readiness validation, ESLint, and Next.js production build passed. The source archive is separately checked locally for integrity and secret patterns.
**Overall product implementation estimate:** approximately 70% (rough engineering estimate; not a production-readiness score).
**Readiness evidence:** 3 of 30 checklist items verified (10% evidence recorded; not a product-completion percentage).
**Database:** no migration applied by this release. Staging and production remain unchanged; staging is at migration 0036 and production at migration 0033.
**Deployment:** no public deployment; owner approval still required.

### Remaining release blockers
1. Complete tenant-isolation acceptance using two organizations and owner/admin/member/suspended staging accounts, including direct API access and approval replay attempts.
2. Configure and verify Groq, Resend delivery/webhooks, scheduled reminders/alerts, duplicate suppression, and failure recovery with privately stored credentials.
3. Confirm backup retention and complete a non-production restore drill.
4. Re-audit effective schema/object privileges after schema or role changes; resolve or formally accept the platform-managed default-ACL limitation.
5. Collect the remaining readiness evidence and obtain explicit owner approval before public deployment.

---

## Crestovia AI — Current Build Status (2026-10-22)

**Project version:** 0.2.98 (merged; API tests, web lint/build, and source packaging passed)
**Release commit:** `2db9946f093763eaeb2dcd8c7284f58893a9dece` (v0.2.98 merge to main)
**Milestone:** Staging anonymous schema-boundary hardening
**Overall product implementation estimate:** approximately 70% (rough engineering estimate; not a production-readiness score).
**Readiness evidence:** 3 of 30 checklist items verified (10% evidence recorded; not a product-completion percentage).
**Deployment:** deferred until owner approval.

### v0.2.98 verified evidence
- API regression tests passed on main release commit: https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39754326941
- Web preflight, helper tests, readiness checks, ESLint, and Next.js production build passed on main release commit: https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39754326771
- Full source archive packaging and secret-pattern verification passed on main release commit: https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39754326746
- Separate staging project `crestovia-ai-staging` (`xpwrsxmwqptrpwycibub`) has migrations 0001 through 0036 applied; production remains at migration 0033 and was not changed.
- Effective `anon` USAGE on schema `public` is false; `authenticated` and `service_role` retain USAGE.
- All 21 public tables have RLS enabled; zero public tables have RLS disabled; zero effective anonymous table DML grants remain; zero public functions are executable by anon.
- Supabase security advisor returned no findings. The platform-managed `supabase_admin` default ACL entries remain in catalog; the schema-boundary mitigation blocks anonymous access unless schema USAGE is later re-granted.

### Critical remaining release blockers
1. Complete tenant-isolation acceptance using two organizations and owner/admin/member/suspended staging accounts, including direct API requests and approval replay attempts.
2. Configure and verify Groq, Resend delivery/webhooks, and scheduled reminders/alerts with privately stored credentials.
3. Confirm backup retention and complete a non-production restore drill.
4. Re-audit effective schema/object privileges after any schema or role changes; resolve or formally accept the platform-managed default-ACL limitation.
5. Collect remaining readiness evidence; public deployment remains owner-gated.


---

## Crestovia AI — Current Build Status (2026-10-22)

**Project version:** 0.2.94 (candidate; CI verification pending)
**Baseline commit:** 6b671062113f16785ec9d255d6d6256594a9d605 (v0.2.93 merged; API/web/package workflows passed)
**Milestone:** Prevent task-reminder starvation using bounded, deduplicated database batches
**Overall product implementation estimate:** approximately 70% (rough engineering estimate; not a production-readiness score).
**Readiness evidence:** 3 of 30 checklist items verified (10% evidence recorded; not a product-completion percentage).
**Deployment:** deferred until owner approval.

### v0.2.93 merged verification
- API tests passed: https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39737683024
- Web ESLint and Next.js production build passed: https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39737683076
- Full source archive packaging and credential-pattern verification passed: https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39737683082; downloaded ZIP contains 212 entries, package version 0.2.93, and SHA-256 `8732e6089f0a519d3ab825a684ff1fa6a8721b688fc716387a3b8de2495739d2`.

### v0.2.94 change
- Reminder selection now excludes task/type/day reminders already queued, allowing subsequent scheduled runs to progress beyond the first 250 overdue and 250 due-soon records.
- The RPC has a hard 500-row maximum and is executable only by service_role. This is a source migration; it has not been applied to the live database.

### Critical remaining release blockers
1. Review migration 0034 and the new reminder RPC grants against live privileges; test migration compatibility in non-production before any owner-approved live apply.
2. Execute the tenant-isolation matrix with separate organizations and owner/admin/member/suspended test accounts, including direct API access.
3. Verify Groq, Resend delivery/webhooks, cron scheduling/alerts, and failure recovery with privately configured credentials.
4. Confirm backup retention and complete an isolated non-production restore drill.
5. Collect evidence for remaining readiness checklist items; public deployment remains owner-gated.

---
## Crestovia AI — Current Build Status (2026-10-22)

**Project version:** 0.2.89 (candidate; CI verification pending)
**Baseline commit:** 64a5771f6335df01b2e4967189671639518d24bc (v0.2.88 merged; API/web/package workflows passed)
**Milestone:** Record live browser-role privilege audit and release evidence
**Overall product implementation estimate:** approximately 70% (rough engineering estimate; not a production-readiness score).
**Readiness evidence:** 3 of 30 checklist items verified (10% evidence recorded; not a product-completion percentage).
**Deployment:** deferred until owner approval.

### v0.2.88 merged verification
- API tests passed: https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39726201740
- Web ESLint and Next.js production build passed: https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39726201648
- Full source archive passed packaging and credential-pattern verification: https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39726201668; downloaded ZIP contains 210 entries, package version 0.2.88, and SHA-256 `31c696d1815d07e941504229d6dbcee190582d4fc702c7a0bf050c717037d12a`.

### Live database audit findings (read-only; 2026-10-22)
- Migration history ends at `0033_retry_unmatched_resend_events_v0_2_56`; migration 0034 is not applied.
- `anon` has effective SELECT/INSERT/UPDATE/DELETE/TRUNCATE on 11 public tables; `authenticated` has effective TRUNCATE/MAINTAIN on 15 public tables.
- Default ACLs for `postgres` and `supabase_admin` still grant browser roles broad privileges on future tables, sequences, and functions.
- The six inventoried RPCs show the expected effective EXECUTE split: `create_organization` and `execute_approved_task_request` are authenticated-callable; the four MFA/rate-limit/Resend RPCs are not executable by browser roles.
- Full query scope and table names are documented in `docs/database/LIVE_AUDIT_2026-10-22.md`. This is a blocker snapshot, not a remediation; no live changes were made.

### Critical remaining release blockers
1. Review migration 0034 against all real API/RPC behavior, stage it in non-production, and verify post-migration grants before any owner-approved live apply.
2. Validate organization isolation with separate organizations and real owner/admin/member/suspended test accounts, including direct API access.
3. Verify Groq, Resend delivery/webhooks, cron scheduling/alerts, and failure recovery with privately configured credentials.
4. Confirm backup retention and complete an isolated non-production restore drill.
5. Collect evidence for remaining readiness checklist items; public deployment remains owner-gated.

---
## Crestovia AI — Current Build Status (2026-10-22)

**Project version:** 0.2.88 (candidate; CI verification pending)
**Baseline commit:** d6cfbd5ea3f7a4821f207aec03d0a7f7a9b2ba53 (v0.2.87 merged; API/web/package workflows passed)
**Milestone:** Refresh exact-release evidence and archive checksum
**Overall product implementation estimate:** approximately 70% (rough engineering estimate; not a production-readiness score).
**Readiness evidence:** 3 of 30 checklist items verified (10% evidence recorded; not a product-completion percentage).
**Deployment:** deferred until owner approval.

### v0.2.87 merged verification
- Source-level migration 0034 RPC compatibility review and regression coverage were merged.
- API tests passed: https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39725699732
- Web ESLint and Next.js production build passed: https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39725699689
- Full source archive passed packaging and credential-pattern verification: https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39725699753; downloaded ZIP contains 210 entries, package version 0.2.87, and SHA-256 `a13919e382eb823a3df54eefa5696b023e83465bca307a05122a9c8797a8fa85`.
- Migration 0034 remains unapplied; no live database query, migration, grant change, or deployment was performed by this release.

### Critical remaining release blockers
1. Compare the source-level RPC inventory to live function signatures/effective grants and review migration 0034 against actual API/RPC behavior before approval. Migration 0034 remains unapplied.
2. Validate organization isolation with separate organizations and real owner/admin/member/suspended test accounts, including direct API access.
3. Verify Groq, Resend delivery/webhooks, cron scheduling/alerts, and failure recovery with privately configured credentials.
4. Confirm backup retention and complete an isolated non-production restore drill.
5. Collect evidence for remaining readiness checklist items; public deployment remains owner-gated.

---
## Crestovia AI — Current Build Status (2026-10-22)

**Project version:** 0.2.87
**Baseline commit:** 672ef261d7b24b8050ed338483e84048cccf9207 (v0.2.86 merged)
**Milestone:** Source-level RPC compatibility review for migration 0034
**Overall product implementation estimate:** approximately 70% (rough engineering estimate; not a production-readiness score).
**Readiness evidence:** 3 of 30 checklist items verified (10% evidence recorded; not a product-completion percentage).
**Deployment:** deferred until owner approval.

### v0.2.86 merged verification
- Recorded successful API tests, web lint/production build, and source archive checks for the exact v0.2.85 merge commit.
- The full source archive was verified: 208 entries, ZIP integrity passed, package version 0.2.86, and the readiness checklist now records three verified Gate A items with links and a SHA-256 hash.
- Added a source-level compatibility inventory and regression coverage for RPC grants affected by migration 0034.
- No live database query, migration, grant change, or deployment was performed.

### Critical remaining release blockers
1. Compare the source-level RPC inventory to live function signatures/effective grants and review migration 0034 against actual API/RPC behavior before approval. Migration 0034 remains unapplied.
2. Validate organization isolation with separate organizations and real owner/admin/member/suspended test accounts, including direct API access.
3. Verify Groq, Resend delivery/webhooks, cron scheduling/alerts, and failure recovery with privately configured credentials.
4. Confirm backup retention and complete an isolated non-production restore drill.
5. Collect evidence for remaining readiness checklist items; public deployment remains owner-gated.

## Crestovia AI — Current Build Status (2026-10-22)

**Project version:** 0.2.82 (candidate; CI verification pending)
**Milestone:** Correct audit SQL grouping before live use
**Overall product implementation estimate:** approximately 70% (rough engineering estimate; not a production-readiness score).
**Deployment:** deferred until owner approval.

### v0.2.82 changes
- Fixes the v0.2.81 read-only RLS audit's first SELECT to include all selected non-aggregate columns in `GROUP BY`, avoiding a PostgreSQL grouping error.
- Adds a regression assertion for the exact grouping clause. No live DB query, migration, grant change, or deployment is performed.
- v0.2.81 was merged and its full source ZIP was verified; v0.2.82 is a proposed follow-up pending CI.

### Current release blockers
1. Review effective database grants and migration 0034 against required API/RPC behavior before approval.
2. Validate organization isolation with separate organizations and real owner/admin/member/suspended test accounts.
3. Verify Groq, Resend delivery/webhooks, cron scheduling/alerts, and failure recovery with privately configured credentials.
4. Confirm backup retention and complete an isolated non-production restore drill.
5. Collect evidence for the production-readiness checklist; public deployment remains owner-gated.

## Crestovia AI — Current Build Status (2026-10-22)

**Project version:** 0.2.81 (in progress)
**Milestone:** Expanded RLS policy and schema privilege audit
**Overall product implementation estimate:** approximately 70% (rough engineering estimate; not a production-readiness score).
**Deployment:** deferred until owner approval.

### v0.2.81 changes
- Read-only audit includes partitioned public tables, FORCE RLS, permissive/restrictive policy counts, policy command/predicate inventory, and effective schema USAGE/CREATE privileges.
- Regression tests require all ten audit statements to remain SELECT-only.
- No live migration, grant change, or deployment is performed. Migration 0034 remains unapplied pending compatibility review and explicit owner approval.

### Current release blockers
1. Review effective database grants and migration 0034 against required API/RPC behavior before approval.
2. Validate organization isolation with separate organizations and real owner/admin/member/suspended test accounts.
3. Verify Groq, Resend delivery/webhooks, cron scheduling/alerts, and failure recovery with privately configured credentials.
4. Confirm backup retention and complete an isolated non-production restore drill.
5. Collect evidence for the production-readiness checklist; public deployment remains owner-gated.

## Crestovia AI — Current Build Status (2026-10-22)

**Project version:** 0.2.80 (in progress)
**Milestone:** Effective browser-role table and sequence privilege audit
**Overall product implementation estimate:** approximately 70% (rough engineering estimate; not a production-readiness score).
**Deployment:** deferred until owner approval.

### v0.2.80 changes
- Read-only SQL audit now checks effective table row-operation and administrative privileges for anon and authenticated, including inherited PUBLIC grants.
- Adds effective sequence privilege checks; direct grants alone do not describe all effective access.
- Adds regression checks that all eight audit statements remain SELECT-only.
- No live migration, grant change, or deployment is performed. Migration 0034 remains unapplied pending compatibility review and explicit owner approval.

### Current release blockers
1. Review the effective privilege audit against required API/RPC behavior before approving migration 0034.
2. Validate organization isolation with separate organizations and real owner/admin/member/suspended test accounts.
3. Verify Groq, Resend delivery/webhooks, cron scheduling/alerts, and failure recovery with privately configured credentials.
4. Confirm backup retention and complete an isolated non-production restore drill.
5. Collect evidence for the production-readiness checklist; public deployment remains owner-gated.

## Crestovia AI — Current Build Status (2026-10-22)

**Project version:** 0.2.79 (in progress)  
**Milestone:** Default function privilege hardening and complete effective-function-grant audit  
**Overall product implementation estimate:** approximately 70% (rough engineering estimate; not a production-readiness score).  
**Deployment:** explicitly deferred until owner approval.

### v0.2.79 changes
- The source migration `0034_revoke_anon_public_privileges.sql` now also revokes default function EXECUTE from `PUBLIC` for objects created by `postgres` and `supabase_admin`, so new RPCs require explicit grants.
- The read-only live database audit now inventories SECURITY INVOKER and SECURITY DEFINER functions and reports effective EXECUTE privileges for `anon`, `authenticated`, and `PUBLIC`.
- Regression tests cover both the default-ACL policy and the expanded read-only audit.
- **Live DB migration 0034 remains unapplied** pending owner approval and compatibility review. The current live privilege audit still shows excessive browser-role table privileges; this is a release blocker. No live DB writes or deployment were performed for this milestone.

### Verified GitHub main baseline before v0.2.79
- `main` was at `c55d0b7` / package version `0.2.78`.
- Latest API CI, web lint/production build, and full-source package workflows passed for that commit.
- No open PRs were present when checked on 2026-10-22.

## Crestovia AI — Current Build Status

**Project version:** 0.2.70 (candidate; CI verification pending)  
**Milestone:** Strong cron-secret enforcement  
**Overall product implementation estimate:** approximately 70% (rough planning estimate; not a test-coverage or production-readiness score)  
**Deployment:** intentionally deferred until the product is complete and the owner explicitly approves launch.

## Version 0.2.70 — Strong cron-secret enforcement
- Rejects reminder scheduler secrets shorter than 32 characters before authorization and admin database-client creation.
- Adds source regression coverage and documents the minimum secret length. Existing private environment settings may need rotation if a shorter value is in use.
- No secret values, live provider settings, or deployment actions are performed by this change.

# Crestovia AI — Current Build Status

**Project version:** 0.2.69 (merged; API and web CI passed)  
**Milestone:** Safe recovery from unexpected reminder failures  
**Overall product implementation estimate:** approximately 70% (rough planning estimate; not a test-coverage or production-readiness score)  
**Deployment:** intentionally deferred until the product is complete and the owner explicitly approves launch.

## Version 0.2.69 — Safe recovery from unexpected reminder failures (completed)
- Adds a final error boundary around reminder sweep runtime work, safe generic 500 responses, and structured failure-stage logging without raw exception details.
- Adds a regression test for unexpected exceptions and generic error behavior.
- Scheduler retries, missed-run recovery, and alert destinations still require owner-controlled configuration and live acceptance. No deployment or secret configuration is performed.

# Crestovia AI — Current Build Status

**Project version:** 0.2.68 (candidate; CI verification pending)  
**Milestone:** Reminder sweep operational observability  
**Overall product implementation estimate:** approximately 70% (rough planning estimate; not a test-coverage or production-readiness score)  
**Deployment:** intentionally deferred until the product is complete and the owner explicitly approves launch.

## Version 0.2.68 — Reminder sweep operational observability
- Adds structured reminder sweep success/failure logs using stage names, counts, and duration only; no task titles, recipient IDs, secrets, or provider diagnostic payloads are logged.
- Adds `durationMs` to successful cron responses and regression checks for the observability contract.
- CI and source checks still do not prove a real scheduler, alert destination, or missed-run recovery; those remain live acceptance tasks. No deployment or secret configuration is performed.

# Crestovia AI — Current Build Status

**Project version:** 0.2.67 (in progress)  
**Milestone:** Monitoring, incident response, and credential-rotation runbook  
**Overall product implementation estimate:** approximately 70% (rough planning estimate; not a test-coverage or production-readiness score)  
**Deployment:** intentionally deferred until the product is complete and the owner explicitly approves launch.

## Version 0.2.67 — Monitoring and incident response (in progress)
- Adds an operator runbook covering availability/readiness, reminder scheduler, email, AI provider, database, and authentication signals.
- Documents safe incident evidence handling, credential rotation, session revocation, containment, and recovery escalation.
- Runbook only: no monitors, alert destinations, secrets, provider settings, or deployments are configured by this change.

## Version 0.2.66 — Backup archive verification and recovery evidence (completed)
- Adds a local-only Node helper to validate custom-format PostgreSQL backup archives with `pg_restore --list` and calculate a SHA-256 checksum.
- Adds synthetic-fixture tests and a recovery runbook; a real isolated restore drill and provider retention confirmation remain required.


- Adds a local-only Node helper for validating PostgreSQL custom-format backup archives with `pg_restore --list` and computing a SHA-256 checksum. It never uploads the backup or prints its path or contents.
- Adds unit tests for missing, empty, symlink, invalid-archive, and valid fixture cases; CI uses synthetic fixtures only.
- Adds an operator runbook for provider retention confirmation, isolated non-production restore drills, RLS/grant verification, and private evidence capture.
- No Supabase migration, live backup/restore, new secret, or deployment is performed by this code change. A real restore drill is still required.

## Version 0.2.65 — Deployment smoke checks (completed)
- Adds a dependency-free script to check API `/health`, API `/ready`, and optionally the web homepage on an explicitly supplied deployment URL.
- Adds mocked-fetch tests for success, non-2xx responses, network failures, malformed URLs, and embedded credentials. CI does not call a live deployment.
- Documents interpretation and limitations; live provider, tenant-isolation, scheduler, and backup/restore acceptance remain required. No deployment was triggered.

## Live Supabase snapshot (checked 2026-10-21)
- Connected project `crestovia-ai` is reported `ACTIVE_HEALTHY`.
- Migration history contains 33 entries through `0033_retry_unmatched_resend_events_v0_2_56`; v0.2.66 does not introduce a database migration.
- Current security advisor response has no lint findings. Performance advisor reports 47 informational unused-index findings; no indexes were removed because production workload evidence is not yet available.
- These checks do not prove real-account organization isolation, provider delivery, scheduler reliability, or backup recoverability.

## Version 0.2.64 — Reject blank CORS origins in readiness probe (completed)
- Tightens `/ready` so a list containing only empty or whitespace CORS origins cannot pass readiness.
- Adds regression coverage and clarifies the deployment health-check documentation.
- No network calls, migrations, or secrets. Live Supabase reachability and account-isolation acceptance remain separate release gates.

## Version 0.2.63 — API configuration readiness probe (completed)
- Adds an unauthenticated `/ready` endpoint that distinguishes process liveness from minimum API configuration readiness.
- Adds tests for missing and present Supabase/JWKS/CORS settings; responses disclose no configuration values and no network checks are performed.
- No database migration or secret values. Live Supabase reachability and account-isolation acceptance remain separate release gates.

## Version 0.2.62 — Capability documentation and deployment configuration alignment (completed)
- Reconciles the README with implemented features and explicitly documents the boundary between source/CI evidence and live production acceptance.
- Declares the missing Resend webhook and cron secret names in the Render blueprint as private, owner-supplied values; no secrets are added and no deployment is triggered.
- Documentation/configuration-only increment; public deployment remains deferred.

## Version 0.2.61 — Configuration preflight and secret-exposure guardrails (completed; live acceptance pending)
- Adds a dependency-free environment preflight for web and API required variables, placeholder values, and sensitive names incorrectly exposed through NEXT_PUBLIC_.
- Adds tests to the web CI workflow and setup documentation. The production profile checks the private integration variables expected by the full deployment.
- Does not prove secrets are valid or integrations work. Live acceptance remains required; no runtime request behavior or database migration changes.
- CI must pass before merge.

# Crestovia AI — Current Build Status

**Project version:** 0.2.61 (in progress)  
**Milestone:** Configuration preflight and secret-exposure guardrails  
**Overall product implementation estimate:** approximately 70% (rough planning estimate; not a test-coverage or production-readiness score)  
**Deployment:** intentionally deferred until the product is complete and the owner explicitly approves launch.

## Version 0.2.60 — Production-readiness evidence and release gate (in progress)
- Adds a single checklist for live tenant isolation, real provider delivery/webhooks, scheduled reminders, monitoring, backups/recovery, and owner-approved launch.
- Explicitly separates merged source/CI evidence from live integration acceptance. No runtime changes, migration, or new secret.
- Public deployment remains deferred.

## Version 0.2.59 — Organization-isolation regression guardrails (completed; live acceptance pending)
- Adds API-CI source checks for active-organization predicates on assistant workspace reads, recipient/organization scoping on notification mutations, and organization-bound atomic approval execution.
- Adds a live two-organization/multi-role acceptance checklist. These checks improve regression coverage but do not prove deployed RLS behavior.
- No migration, new secret, or runtime behavior change. API tests, web lint, and production build passed before merge.
- Public deployment remains deferred.

## Version 0.2.58 — Bounded owner email-MFA verification request bodies (completed)
- Caps MFA verification payloads at 4,096 bytes while streaming and before JSON parsing; rejects oversized declared bodies early and cancels oversized streamed bodies.
- Preserves authentication, owner-only checks, session-bound single-use challenges, atomic failed-attempt counting, and timing-safe comparisons.
- Regression guardrails added. API validation, web lint, production build, and full source packaging must pass before merge.
- No migration or new external secret. Public deployment remains deferred.

## Version 0.2.57 — Bounded Resend webhook request-body reads (completed)
- Adds a 256,000-byte cap enforced while reading the stream, with early rejection for oversized Content-Length and cancellation when streamed bytes exceed the cap.
- Avoids reading an arbitrarily large body into memory before checking size. Existing signature verification and event processing remain unchanged.
- Regression guardrails added. API validation, web lint, production build, and full source package must pass before merge.
- No migration or new external secret. Public deployment remains deferred.

## Version 0.2.56 — Resend webhook retry reconciliation (implementation merged; live acceptance pending)
- PR #32 is merged. API tests, web ESLint, and the Next.js production build passed.
- Migration `0033_retry_unmatched_resend_events_v0_2_56.sql` is applied to Supabase project `crestovia-ai`. The RPC remains SECURITY INVOKER with an empty search path; EXECUTE is granted to `service_role` only. The security advisor returned no findings.
- The migration allows previously unmatched Resend events to be retried after the matching delivery row becomes available; processed event IDs remain idempotent.
- Real Resend webhook/retry acceptance tests still require private provider configuration. Public deployment remains deferred.

## Version 0.2.55 — Email provider diagnostic rate limits (completed)
- Limits the owner-only Resend connection test to 3/minute and 10/hour before contacting the provider; fails closed if the rate-limit service is unavailable.
- Reuses migration 0032 and the existing private service-role configuration. API tests, web lint, and production build passed before merge.
- Live provider verification remains dependent on private Resend credentials. Public deployment remains deferred.

## Version 0.2.54 — Approval request rate limits (completed)
- Adds shared per-user limits to direct approval requests and assistant-generated proposals: 3/minute, 10/hour, and 30/day.
- Reuses the private Supabase rate-limit RPC; no new migration or external secret. API tests, web lint, and production build must pass before merge.
- Real-account approval workflow tests remain outstanding. Public deployment remains deferred.

## Version 0.2.53 — Team invitation throttling and duplicate protection (completed)
- Adds per-owner invitation limits of 5/minute, 20/hour, and 50/day; checks known pending invitations and tracked active memberships before sending an invitation email.
- Reuses the private atomic rate-limit RPC from migration 0032. No new database migration is needed. API regression tests, web lint, and production build must pass before merge.
- Live onboarding and multi-account acceptance tests remain outstanding. Public deployment remains deferred.

## Version 0.2.52 — Atomic assistant request rate limits (completed)
- Adds atomic per-user minute/hour limits for assistant prompts and owner-only provider diagnostics using a private Supabase ledger; requests fail closed if the limiter is unavailable.
- Migration `0032_user_rate_limits_v0_2_52.sql` is applied to Supabase. SQL checks confirm SECURITY INVOKER, empty search path, service-role-only execution, and no browser table access; security advisor has no findings.
- API tests, ESLint, Next.js production build, and source packaging passed on main. Live multi-account tests and provider verification remain outstanding; public deployment remains deferred.

## Version 0.2.51 — Preserve assistant prompts on provider failure (completed)
- Persists the user's message and updates the conversation title before requesting an AI reply, preventing provider errors from discarding submitted text.
- Clarifies UI error copy and adds regression coverage for persistence ordering.
- No database migration required. API CI, web lint, and production build passed before merge.
- Live provider verification still requires a private Groq key. Public deployment remains deferred.

## Version 0.2.50 — Fair bounded task-reminder scans (completed)
- Splits overdue and upcoming tasks into separate 250-row bounded queries so overdue backlog cannot consume the entire upcoming-task scan.
- Reports overdue and upcoming scan counts separately; adds regression checks for the independent quotas and sorting.
- No schema migration required. API CI, web lint, and production build passed after merge.
- Private `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, and trusted scheduler configuration remain required for live reminders; larger backlogs may need future pagination.
- Public deployment remains deferred.

## Version 0.2.49 — Task-reminder cron guardrail regression coverage (completed)
- Added API-CI regression checks for server-only cron authorization, bounded task scans, exclusion of completed/cancelled tasks, notification deduplication, no-cache headers, and generic failure responses.
- Test-only increment; no runtime behavior or database schema changed. GitHub Actions must pass before merge.
- Deadline reminders still require private `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` configuration plus a trusted scheduler in the deployed environment. Static regression checks do not replace live HTTP/scheduler testing.
- Public deployment remains deferred.

## Version 0.2.36 — Read-only assistant tool guardrails (in progress)
- Added regression coverage to ensure workspace assistant tools remain read-only, organization-scoped, user-scoped for assigned tasks, and bounded by query limits.
- Test-focused increment; no runtime behavior or database schema change. CI must pass before merge. Public deployment remains deferred.

## Version 0.2.35 — Owner-only live AI connection test (completed)
- Added an owner-only server-side Groq test request with a 10-second timeout and a tiny token budget. It does not persist messages or display the API key.
- API tests, ESLint, and Next.js production build passed on main after PR #9 merged. Provider connectivity still requires a valid privately configured GROQ_API_KEY.
- No database migration is required. Public deployment remains deferred.

## Version 0.2.34 — AI provider readiness visibility (completed)
- The assistant page distinguishes a missing server-side GROQ_API_KEY from a detected key, without rendering the secret. Presence does not mean the provider connection is valid.
- Added private setup guidance and regression coverage. API tests, ESLint, and Next.js production build passed; PR #8 merged into main.
- No schema migration was needed. Public deployment remains deferred.

## Version 0.2.33 — Editable private memory (completed)
- Added private-memory editing with bounded title/content, an allow-list for categories, explicit user_id predicates on lookup and update, and updated timestamps.
- Added regression coverage for account scoping and validation. API tests, ESLint, and Next.js production build passed; PR #7 merged into main.
- No schema migration or new secret was needed. Public deployment remains deferred.

## Version 0.2.32 — Assistant account-isolation hardening (completed)
- Added explicit user_id filters to assistant conversations, messages, saved memories, and title updates as defense in depth alongside Supabase RLS.
- API tests, web lint, and Next.js production build passed; PR #6 merged into main.
- Live multi-account/cross-organization acceptance tests remain required. Public deployment remains deferred.

## Version 0.2.31 — Membership policy hotfix (completed)
- Applied migration 0020 to remove the duplicate legacy membership bootstrap INSERT policy. The policy catalog confirms one INSERT policy on memberships.
- API tests, ESLint, and Next.js production build passed; PR #5 merged to main. Supabase security advisor has no findings.
- Public deployment remains deferred.

## Version 0.2.30 — RLS policy consolidation (merged and applied)
- PR #4 merged after API tests, web ESLint, and Next.js production build passed.
- Applied migration 0019: command-specific owner writes and a consolidated organization relationship SELECT policy preserve the intended access predicates.
- Supabase security advisor returned no findings. Performance review found a duplicate membership INSERT policy; the v0.2.31 hotfix removes it.

## Version 0.2.29 — Foreign-key lookup performance (completed)
- Added 19 non-destructive indexes covering foreign-key lookup patterns identified by Supabase's performance advisor. API tests and web lint/production build passed in GitHub Actions; PR #3 merged to `main`.
- Applied the index migration to the connected Supabase project and verified all 19 indexes exist. The advisor no longer reports unindexed foreign keys, and the security advisor returns no findings.
- Remaining performance findings are five multiple-permissive-policy warnings and unused-index notices. These need careful policy consolidation and real workload data; no RLS policies or existing indexes were removed in this increment.
- No application runtime behavior changed. Public deployment remains deferred.

## Version 0.2.28 — Authentication and audit regression coverage
- Added source regression checks for email-MFA origin validation, owner-only access, current-session challenge binding, expiry, atomic failed-attempt RPC use, and one-time consumption before cookie issuance.
- Added audit writer boundary tests and documented live acceptance requirements.
- Fixed the approval test whitespace normalizer; it now collapses SQL whitespace correctly.
- No runtime behavior or database schema changed. Real multi-user, email-provider, and concurrent-request tests remain outstanding.

## Version 0.2.27 — Approval workflow guardrails
- Added automated source regression tests for active-member self-request, owner-only review, pending/unexpired request constraints, audit events, and the no-external-execution boundary.
- Added `docs/security/APPROVAL_WORKFLOW.md` with the approval security contract and a real-account acceptance checklist.
- API pytest and web lint/build checks passed for the merged feature branch. Source tests do not replace real-account RLS testing.
- No database migration, new external key, or deployment was needed. Public deployment remains deferred.


## Version 0.2.26 — MFA regression test alignment
- Replaced the obsolete compare-and-set assertion with regression checks for the atomic failed-attempt RPC introduced in 0017.
- The first v0.2.25 API CI run correctly failed on the outdated test, not on an application runtime test; the new commit updates the test to match the new RPC design.
- Re-running API and frontend CI before considering this increment verified.

## Version 0.2.25 — Atomic email-MFA failed-attempt counting
- Added migration 0017 with a SECURITY INVOKER RPC that atomically increments failed email-code attempts and locks the challenge on the fifth failure.
- The RPC is executable only by service_role; verified anon/authenticated EXECUTE privileges are false, service_role EXECUTE is true, and the function is not SECURITY DEFINER.
- Updated the verification endpoint to call the RPC, preventing simultaneous invalid-code submissions from overwriting one another or escaping the five-attempt cap.
- Added a pytest source regression check. Real parallel HTTP tests, email delivery, and session-bound MFA acceptance testing remain pending.
- Supabase security advisor returned no security lint findings after applying migration 0017. No public deployment occurred.

## Version 0.2.24 — Atomic email-MFA challenge issuance
- Added migration 0016 with a SECURITY INVOKER database function that serializes challenge issuance per user using a PostgreSQL transaction advisory lock. Applied to Supabase; verified the function is not SECURITY DEFINER and EXECUTE is granted only to postgres/service_role.
- The function atomically checks the five-per-hour limit and 60-second cooldown, invalidates older unused challenges for the same session, and inserts the new challenge.
- Function EXECUTE is revoked from PUBLIC, anon, and authenticated and granted only to service_role; the request endpoint calls it through the server-only admin client.
- CI regression checks passed (7 pytest tests; frontend lint and production build also passed). Live email delivery and concurrency testing still require configured provider secrets and a real test account.

## Version 0.2.23 — Concurrent email MFA attempt hardening
- Failed email-code attempts now use a compare-and-set database update, matching the challenge's previously read attempt count and requiring it to remain unused.
- Concurrent failed submissions cannot silently overwrite the same attempt counter; stale updates return a conflict instead of reporting an ordinary wrong-code result.
- Added a pytest source regression check that runs in API CI. This is not a substitute for a real multi-request integration test against Supabase.
- No schema migration, API key, or public deployment was needed.

## Version 0.2.22 — Audit permission regression tests
- Added pytest regression checks for migration 0014 (active owner/admin membership and organization-scoped SELECT) and migration 0015 (browser roles are read-only).
- Added docs/security/AUDIT_LOG_ACCESS.md explaining the security contract and the limits of static migration tests.
- Existing API CI automatically runs these checks. No new credentials or schema changes are needed.
- These tests guard the migration source but do not replace live owner/admin/member and cross-organization acceptance testing.

## Version 0.2.21 — Audit history permission alignment
- Fixed a policy mismatch: the audit page supports owner/admin viewing, but the database previously restricted SELECT access to owners only.
- Added migration `0014_audit_log_admin_read_access.sql`; active owners and admins can read audit records for their own organization.
- Added migration `0015_audit_logs_browser_read_only.sql` to revoke all browser-role table privileges and grant authenticated SELECT only. Live privilege checks confirmed anon has no SELECT, authenticated cannot INSERT/UPDATE/DELETE, and service_role retains INSERT.
- Applied migrations 0014–0015 to the connected Supabase project. Verified the resulting `pg_policies` entry, browser-role grants, and that the Supabase security advisor returned no security lint findings.
- Real-account owner/admin/member isolation tests remain required. No public app deployment was performed.

## Version 0.2.20 — Audit history and workspace event logging
- Added an owner/admin-only audit history page, with action filtering and the latest 100 matching records.
- Added server-side audit events for project/task/department changes, task comments, project membership changes, team membership access changes, and approval request creation/review.
- Audit writes are best-effort through the server-only admin client. The service-role secret must be configured privately for reliable writes; no secrets are exposed to the browser.
- Metadata is limited to identifiers and short labels; comment bodies and long free-text details are not copied into audit records.
- Historical event coverage can be incomplete. No database migration or public deployment was performed; real-account verification remains required.

## Version 0.2.19 — Permission-aware read-only assistant tools
- Added a typed, explicit allow-list for workspace overview and current-user assigned-task lookups.
- Assistant only requests workspace context when the latest user message indicates relevant company/workspace intent.
- All tool reads use the authenticated Supabase client and therefore remain subject to existing RLS; output is bounded and includes caveats about partial result sets.
- Tool output is treated as untrusted data. No write-capable tools, arbitrary SQL, shell, integrations, or approval execution were added.
- No database migration, new API key, or public deployment was needed. CI and real-account acceptance tests must verify this increment.

## Version 0.2.18 — Invitation tracking, acceptance, and revocation
- Connected owner-created Supabase Auth invitations to the existing `organization_invitations` table with organization, email, invited user, inviter, role, and pending status.
- Added pending invitation visibility and owner revocation on the Team Access page.
- Revocation marks the tracking row revoked and suspends the associated membership if it is still invited. It does not delete the auth account.
- Acceptance updates the tracking row to accepted before activating the invited membership; if activation fails, the tracked row is reset to pending. Older invited memberships without a tracking row remain accepted through the compatibility path.
- Added migration `0013_expand_invitation_roles.sql` to align tracked role constraints with supported organization roles. The role constraint was applied to the connected Supabase project.
- Real email delivery and complete multi-account acceptance/revocation tests are still required. No deployment occurred.

## Version 0.2.17 — Department management and project organization
- Added a Departments page to create, edit, and delete departments for owners, admins, and managers. Database RLS remains the final authorization boundary.
- Added department counts, project assignment during project creation, and department labels on project cards.
- Deleting a department preserves its projects and clears their department assignment via the existing foreign-key behavior.
- No schema change or new secret is required; this uses the existing departments table and authenticated Supabase session.

## Version 0.2.16 — Daily briefing
- Added a workspace-aware daily briefing that summarizes overdue work, today's deadlines, the next seven days, blocked tasks, in-progress tasks, active projects, unexpired approval requests, and recent workspace activity.
- Briefing queries use the signed-in user's Supabase session and database RLS; team members see only tasks/projects/activity available to their account.
- Uses the account's saved timezone with a safe `Asia/Karachi` fallback for date grouping.
- Added direct links from the dashboard and briefing sections to the task board, projects, assistant, and approvals.
- The briefing is deterministic and data-based; it does not require an AI API key and does not execute actions.

## Current capabilities
- Next.js frontend, Supabase Auth, protected dashboard, sign-in, sign-out, callback, and onboarding.
- FastAPI health and authenticated identity endpoints.
- Owner-only project creation with optional department assignment, department management for owner/admin/manager roles, task creation/status updates, task comments, member role/status controls, and project-level viewer/contributor/manager assignments.
- Owner-initiated Supabase Auth invitations with tracked pending/accepted/revoked states, owner revocation controls, and an onboarding acceptance flow.
- RLS-protected approval requests with owner approve/reject decisions; approvals are records only and do not execute external actions.
- Private per-user assistant conversations and saved memories, with a server-side Groq provider adapter and chat UI.
- Owner email-code second factor when private provider settings are configured, with authenticator-app TOTP as fallback.
- Data-based daily briefing with deadline, blocked-work, project, approval, and recent-activity summaries.
- Supabase schema migrations through 0017 are represented in source; all 17 public tables had RLS enabled at the last full-table check; migrations 0014–0015 additionally harden audit-log grants. The organization_invitations table is wired into owner invite, acceptance, and revocation workflows; membership status remains the authorization gate for workspace access.

## Verification
- Private GitHub repository: https://github.com/Hassaantahir72/crestovia-ai
- Supabase security advisor returned no security lint findings after migrations 0014–0015; re-check after future schema changes.
- Organization creation uses SECURITY INVOKER with RLS-constrained bootstrap policies.
- Python/API CI: v0.2.25 caught an obsolete regression assertion; v0.2.26 updates the test to the atomic RPC and awaits a clean CI run. Frontend ESLint and Next.js production build passed in GitHub Actions for the v0.2.24 source commit.
- GitHub Actions frontend lint and production build passed for v0.2.18 application source at commit 2234cbe80a5443a0548ede2778bb6f77dc0582fc. The following commit only refreshes this status documentation.
- Local npm installation timed out in this environment; no local production build is claimed.
- No public application deployment has been created.

## Security implementation notes
- Owner dashboard, project, team, assistant, memory, approval, and write-action paths require the session-bound email-MFA verification cookie or a verified TOTP factor with AAL2 assurance.
- Email OTP codes are random six-digit values, hashed with a server-only secret, expire after 10 minutes, are invalidated after use, have a 60-second resend cooldown, a per-account hourly send limit, and a five-attempt cap.
- Successful email verification creates a signed HttpOnly cookie bound to the current Supabase session.
- Email challenge records are RLS-enabled, have no browser grants, and have an explicit deny policy for anon/authenticated roles. Only the server-side service-role client can access them.
- Invitation acceptance is restricted to the authenticated user's own invited membership; invited users remain blocked from workspace data until acceptance.
- Assistant has an explicit allow-list of read-only workspace overview and assigned-task tools. Reads use the authenticated client and inherit RLS. No write-capable tools or external-action capability is enabled. If configured, recent chat and selected saved memories are sent to Groq for reply generation.
- Daily briefing uses normal authenticated Supabase queries and inherits RLS; it does not use service-role access.

## Required private configuration before real-world use
- `SUPABASE_SERVICE_ROLE_KEY` for invitation administration and email-MFA challenge storage.
- `APP_MFA_SECRET` (random value at least 32 characters) for email-code hashing and signed-cookie verification.
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` from a verified sender for email-code delivery.
- `GROQ_API_KEY` for AI replies; `GROQ_MODEL` is configurable.
- Configure these only in local private environment files or the hosting provider's secret settings. Never paste them into chat, commit them, or expose them through `NEXT_PUBLIC_*` variables.
- Daily briefing itself needs no external API key.

## Remaining work
- Complete owner/admin/member audit-history access tests using separate real accounts and verify cross-organization records remain invisible; source-migration regression tests now run in CI.
- Verify email delivery, expiry, replay rejection, resend limits under parallel requests, atomic wrong-code lockout under parallel submissions, session binding, sign-out/session rotation, and TOTP fallback using real accounts.
- Verify invitations end-to-end using a new test email and ensure Supabase Auth redirect URLs/email delivery are configured.
- Test owner, unassigned member, viewer, contributor, manager, and suspended-member access across at least two projects and multiple organizations.
- Finish audit coverage, rate limiting, recovery/session revocation, backup/restore drill, dependency/security review, and production acceptance tests.
- Expand the permission-checked AI tool registry with tested, narrowly scoped read-only tools; connect approvals to future allow-listed actions only after a separate secure execution design. No external action should execute merely because the model requested it.
- Add reminders/notifications, voice, integrations, and automation.
- Complete final security and user acceptance tests before deployment. No public deployment is authorized yet.

## Phase estimates
- Architecture/planning: 100%
- Phase 1 foundation: 85% (schema, auth scaffolding, safe organization bootstrap; real-account tests pending)
- Phase 2 workspace: 58% (project/task writes, comments, member controls, assignments, invitation acceptance; real-user testing pending)
- Phase 3 AI/memory/approvals: 32% (private chat/memory and approval-request queue foundation; provider secret, approval execution, and tool systems pending)
- Phase 4 assistant/voice/productivity: 10% (data-based daily briefing implemented; voice/reminders remain pending)
- Phase 5 integrations: 0%
- Phase 6 automation/hardening: 15% (MFA and RLS baseline implemented; security acceptance testing remains)

These are implementation estimates, not production-readiness claims.
