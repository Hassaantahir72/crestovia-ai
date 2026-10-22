## v0.2.98 — Staging anonymous schema-boundary hardening

- Adds migration 0036 to revoke effective `USAGE` on the exposed `public` schema from `anon` and `PUBLIC`, while retaining `authenticated` and `service_role` access.
- Applied and verified on the separate staging project: 36 migrations recorded, all 21 public tables have RLS enabled, anonymous schema usage is false, authenticated/service-role schema usage remains true, and the Supabase security advisor reports no findings.
- Adds regression coverage for the new migration and updates the tenant-isolation runbook and staging acceptance evidence.
- The platform-managed `supabase_admin` default ACL entries remain unchanged; the schema boundary mitigates anonymous access unless schema usage is later re-granted. Re-audit after future schema/privilege changes.
- Staging only. Production remains at migration 0033; no production database changes or public deployment are authorized. Real multi-organization account tests, live provider integration checks, and backup/restore evidence remain open.

## v0.2.97 — Reminder RPC grant and dedupe regression coverage

- Adds focused CI assertions that the task-reminder batch RPC runs as SECURITY INVOKER with an empty search path and is executable only by `service_role`.
- Adds regression checks for stable task/type/day dedupe keys and conflict-safe queue insertion, protecting the bounded reminder batch from accidental privilege widening or duplicate enqueueing.
- No runtime SQL or live database change in this release; migration 0035 remains unapplied in the connected project. Real cron delivery and migration acceptance remain environment-dependent.

## v0.2.96 — Correct global default-ACL hardening

- Fixes migration 0034 so it revokes relevant global default privileges as well as public-schema-specific defaults; global ACL grants are additive and cannot be cancelled by schema-specific revokes.
- Documents the intentional cross-schema effect on future objects created by `postgres` and `supabase_admin`, and adds regression coverage for the global revoke invariants.
- Updates the migration compatibility runbook to require reviewing non-public schema dependencies before any application.
- API tests and web preflight, smoke-helper tests, readiness checks, ESLint, and Next.js production build passed; full source archive packaging and credential-pattern verification passed on merge commit `073606c6d54e34b14201160e53786cb44ae32f1e`.
- Source-only change. No live database grants, migration history, data, or deployment were changed. Non-production acceptance and explicit owner approval remain required.

## v0.2.96 — Correct global default-ACL hardening

- Fixes migration 0034 so it revokes relevant global default privileges as well as public-schema-specific defaults; global ACL grants are additive and cannot be cancelled by schema-specific revokes.
- Documents the intentional cross-schema effect on future objects created by `postgres` and `supabase_admin`, and adds regression coverage for the global revoke invariants.
- Updates the migration compatibility runbook to require reviewing non-public schema dependencies before any application.
- Source-only change. No live database grants, migration history, data, or deployment were changed. Non-production acceptance and explicit owner approval remain required.

## v0.2.95 — Detect credentialed database URLs in source archives

- Extends fail-closed source-archive scanning to detect PostgreSQL connection URLs that embed a password, including common `postgres://` and `postgresql://` forms.
- Adds regression coverage that confirms a matching URL fails verification without printing the password.
- API regression tests passed on PR commit `a05cf65ea357f199ef577fde09cb559270002e35`; web preflight tests, ESLint, and Next.js production build passed on the same commit.
- Full source archive packaging and credential-pattern verification passed on merge commit `150148efe4fbff7f3cbc3f770b16867914ffe76a`; ZIP contains 213 files and SHA-256 `c55a2dc447759055862001b1d4209f3d983fcf3962164e3aeb774d9c7a379ccd`.
- Source-level archive protection only; it does not rotate exposed credentials, inspect private hosting settings, or change the live database. Migration 0034 and production-readiness blockers remain open.

## v0.2.94 — Prevent task-reminder starvation with bounded deduplicated batches

- Moves reminder selection and notification insertion into a service-role-only database RPC with a strict maximum batch of 500.
- Excludes reminders already queued for the task/type/day so repeated cron runs advance to additional eligible tasks instead of repeatedly selecting the same first page.
- Preserves secret checks, generic errors, no-store responses, and PII-minimized metrics.
- Adds regression coverage for the bounded/idempotent RPC and route contract.
- Source migration only; no live migration was applied. Migration 0034 and non-production acceptance remain blockers for live rollout.

## v0.2.93 — Expand source-archive credential scanning

- Detects additional common Stripe live/restricted keys, Slack tokens, GitLab personal access tokens, and npm tokens during source archive verification.
- Fails closed on archive members larger than the verifier's credential-scan size limit instead of silently skipping their contents.
- Adds regression tests that ensure tokens are not echoed in failure output and oversized members cannot bypass scanning.
- Refreshes the readiness evidence log to the verified v0.2.92 release archive.
- No live database changes, migrations, or deployments were performed.

## v0.2.92 — Add tenant-isolation acceptance runbook

- Adds a non-production acceptance matrix for cross-organization reads/mutations, multi-org context switching, suspended users, notifications, assistant context, exports, and approval replay.
- Documents synthetic fixture setup, evidence handling, and exit criteria; explicitly leaves the live tenant-isolation gate open until executed and reviewed.
- Adds a regression test that protects coverage of the critical negative cases.
- Updates build status and release evidence to the verified v0.2.91 baseline.
- Documentation and test guardrails only. No live database changes, migrations, or deployments were performed.

## v0.2.91 — Include global default ACLs in live security audit

- Fixes audit query 5 so it reports both global (defaclnamespace = 0) and public-schema default privileges; global ACLs can affect new objects in public and were omitted by the prior schema-only filter.
- Adds a regression test to prevent the default-privilege audit from silently excluding global ACLs.
- Updates the migration 0034 compatibility runbook to require reviewing both default-ACL scopes.
- Source audit/documentation improvement only. No live database changes, migrations, or deployments were performed.

## v0.2.90 — Revoke all default sequence privileges from anon

- Fixes migration 0034 so future sequences created by `postgres` and `supabase_admin` revoke ALL privileges from `anon`, including UPDATE; the previous USAGE/SELECT-only revocation left UPDATE in the default ACL.
- Updates migration regression tests to require the complete default-sequence revoke and prevent the narrower statement from returning.
- Refreshes release metadata and verified v0.2.89 CI/archive evidence.
- Source-only hardening fix. Migration 0034 remains unapplied; no live privileges, schema, data, or deployment were changed. Non-production acceptance and explicit owner approval remain required.
## v0.2.89 — Record live browser-role privilege audit

- Records a fresh read-only Supabase privilege audit: migration history still ends at 0033, migration 0034 is not applied, and excessive effective browser-role table/default privileges remain.
- Documents the 11 public tables where `anon` currently has effective SELECT/INSERT/UPDATE/DELETE/TRUNCATE and the 15 tables where `authenticated` has effective TRUNCATE/MAINTAIN, while noting that RLS does not filter administrative privileges.
- Confirms the six inventoried RPCs have the intended effective EXECUTE split: two authenticated client RPCs and four service-only RPCs.
- Adds a regression check that keeps the audit snapshot explicit about its read-only scope and unapplied migration status.
- No live grants, migration history, data, or deployment were changed. Migration 0034 remains blocked pending compatibility review, non-production acceptance, and owner approval.
## v0.2.88 — Refresh verified release evidence

- Updates the production-readiness evidence log to the exact v0.2.87 merge commit after its API tests, web lint/production build, and full-source archive workflow completed successfully.
- Records the current archive SHA-256, entry count, package version, and exact workflow links without marking any live acceptance item complete.
- Refreshes the build-status header and keeps live database migration/grant review, multi-organization acceptance, real provider tests, restore drill, and owner launch approval outstanding.
- Documentation and release-metadata update only. No live database query, migration, privilege change, or deployment is performed.

## v0.2.87 — Document migration 0034 RPC compatibility

- Adds a source-level compatibility matrix for browser-callable and server-only RPC functions affected by privilege hardening.
- Adds regression tests protecting explicit `authenticated` grants for organization bootstrap and approved-task execution while keeping MFA, email webhook, and rate-limit RPCs service-role-only.
- Explicitly distinguishes source review from live grant verification; migration 0034 remains unapplied until owner approval and live audit review.
- No live database query, migration, privilege change, or deployment is performed.

## v0.2.86 — Record verified release evidence

- Marks the API workflow, web lint/production build, and full-source archive checks complete based on successful runs for merge commit `c5ae088d72d143cead8b444de4518754b50a8575`.
- Records the workflow links and source archive SHA-256 in the production-readiness checklist so the evidence count reflects verified facts rather than remaining artificially at zero.
- Leaves live database migration/grant verification, tenant acceptance, real provider tests, restore drill, and owner launch approval unchecked.
- Documentation/test-only change. No live database query, migration, privilege change, or deployment is performed.

## v0.2.85 — Test the production-readiness report

- Adds automated tests for readiness checklist structure, JSON summary totals, gate grouping, and strict-mode blocking while evidence remains pending.
- Runs readiness-report tests in web CI so release evidence cannot silently regress.
- Updates build status and adds a version/base-commit consistency guard. No live database query, migration, privilege change, or deployment is performed.

## v0.2.84 — Synchronize verified build status

- Updates the build-status dashboard to reflect the merged v0.2.83 commit, successful API and web checks, and verified 207-entry source archive.
- Adds regression coverage to prevent the current build status and web package version from drifting out of sync.
- Documentation/test-only milestone. No live database queries, migrations, privilege changes, or deployment are performed.

## v0.2.83 — Fix README operations formatting

- Replaces literal escaped newline characters in the implemented-capabilities section with actual Markdown line breaks so the operations list and guidance render correctly.
- Adds a regression test preventing escaped newline sequences from reappearing in the README.
- Documentation/test-only change; no live database change or deployment is performed.

## v0.2.82 — Fix RLS audit query grouping

- Corrects the first read-only database audit query to group by every selected non-aggregate relation/RLS field, including relation kind and FORCE RLS.
- Adds a regression assertion for the complete GROUP BY clause so PostgreSQL will not reject the audit query at execution time.
- No live database change or deployment is performed.

## v0.2.81 — Expand RLS and schema permission audit

- Includes ordinary and partitioned public tables in RLS coverage checks and reports FORCE RLS plus permissive/restrictive policy counts.
- Adds a policy inventory with command, role, predicate, and check expressions for targeted review.
- Audits effective public-schema USAGE/CREATE privileges for anon and authenticated, including inherited grants.
- Adds read-only regression coverage for all ten SQL statements. No live DB changes or deployment performed.

## v0.2.80 — Audit effective table and sequence privileges

- Extends the read-only live database audit to check effective table SELECT, INSERT, UPDATE, DELETE, and administrative privileges for anon and authenticated, including grants inherited through PUBLIC.
- Adds effective sequence USAGE, SELECT, and UPDATE checks so direct-grant inventory is not mistaken for the complete permission picture.
- Adds regression coverage that keeps every audit statement read-only. No live database changes or deployment are performed; migration 0034 remains unapplied pending owner approval and compatibility review.

## v0.2.79 — Default function privilege hardening and live audit coverage

- Updates the unapplied privilege-hardening migration to revoke default `EXECUTE` from `PUBLIC` for future functions created by `postgres` and `supabase_admin`; future RPC grants must be explicit.
- Expands the read-only live database audit to inventory all public functions, including SECURITY INVOKER routines, and report effective EXECUTE access for `anon`, `authenticated`, and `PUBLIC`.
- Adds regression checks for the default ACL revocations and the expanded read-only audit. No live migration is applied and no deployment is triggered.

## v0.2.78 — Harden public-schema browser-role privileges

- Adds a reviewable migration to revoke all existing and default public-schema table, sequence, and function privileges from unauthenticated `anon`.
- Removes table-level TRUNCATE, REFERENCES, TRIGGER, and PostgreSQL 17 MAINTAIN privileges from authenticated users while preserving normal row-level operations subject to RLS; future function EXECUTE grants become opt-in for browser roles.
- Extends the read-only database audit to inspect default ACLs and effective table-level administrative privileges; adds regression checks.
- **Migration is source-only and has not been applied to the connected database.** Live application requires owner approval after compatibility review.

## v0.2.77 — Read-only live database audit runbook

- Adds a SELECT-only SQL audit for public-table RLS/policy coverage, browser-role grants, public SECURITY DEFINER functions, and recorded migration history.
- Documents the 2026-10-21 read-only findings: 21/21 public tables have RLS and policies, Security Advisor had no findings, and migration-name mapping needs careful reconciliation before any automated sync.
- Records that the database is empty of application rows, so tenant isolation has not been demonstrated with live organization data; informational unused-index findings should be revisited after representative traffic.
- No database changes or deployment are performed.

## v0.2.76 — Enforce cron secret strength in preflight

- Extends production configuration preflight to reject CRON_SECRET values shorter than 32 characters before deployment setup proceeds.
- Adds tests for short-secret rejection, safe non-disclosure, and acceptance of a sufficiently long value when required configuration is present.
- The runtime endpoint's existing minimum-length enforcement remains the final server-side guard; this preflight is an earlier operator feedback layer.

## v0.2.75 — Enforce release metadata consistency

- Extends source archive verification to require a readable package manifest and changelog, and to confirm their release versions match.
- Adds regression coverage for mismatched release metadata, preventing source ZIPs from silently carrying stale package versions.
- Keeps the archive verifier fail-closed; secret-pattern checks remain heuristic and do not guarantee detection of every credential format.

## v0.2.74 — Database migration sequence audit

- Adds a repeatable migration-source checker that detects malformed filenames, duplicate versions, missing sequence numbers, unreadable files, and empty migrations.
- Adds regression tests and a package command so migration ordering can be checked before release.
- Explicitly states that source ordering does not prove a live database has applied migrations or has correct grants/RLS; those remain owner-controlled acceptance checks.

## v0.2.73 — Evidence-based readiness report

- Adds a repeatable readiness report that counts only explicitly checked checklist evidence across Gates A–F.
- Adds JSON output, a structural validator, and a strict mode that exits non-zero while any readiness item remains outstanding.
- Protects against accidental false-ready claims by requiring the launch authorization item to remain owner-gated and the checklist to state its not-ready status.
- Adds regression tests and package scripts. Reporting is not live provider verification and does not authorize deployment.

## v0.2.72 — Prevent implicit Render deployments

- Disables Render Blueprint auto-deploy so a source merge cannot silently trigger a hosted rollout through this service definition.
- Clarifies that creating or deploying a preview requires explicit owner authorization and private environment configuration.
- Adds regression guardrails for deployment defaults and documentation. No hosting account is accessed and no deployment is initiated; public launch remains owner-gated.

## v0.2.71 — Verify distributable source archives

- Adds a fail-closed source ZIP verifier for archive integrity, unsafe paths, local environment files, development artifacts, private-key headers, and recognizable provider-token patterns.
- Runs archive verification before the release artifact is uploaded and adds regression tests that ensure detected token values are never echoed.
- Safe environment example templates remain allowed. This is a guardrail, not a guarantee against every possible secret format; public deployment remains deferred.

## v0.2.70 — Enforce strong task-reminder cron secrets

- Rejects configured `CRON_SECRET` values shorter than 32 characters before authorization or database access, returning a generic non-cacheable 503 response.
- Adds a regression guardrail and updates scheduler setup guidance. Existing deployments using shorter secrets must rotate to a strong random value in their private hosting and scheduler settings.
- No secrets are added and no deployment is triggered.

## v0.2.69 — Safe recovery from unexpected reminder failures

- Wraps the reminder sweep's runtime work in a final safe error boundary so thrown network/runtime exceptions return a generic non-cacheable 500 instead of leaking diagnostic details.
- Emits a structured failure stage without task/user payloads or raw exception text.
- Adds regression guardrails. This improves error visibility but does not itself configure scheduler retries, alerts, or missed-run recovery; no deployment is triggered.

## v0.2.68 — Reminder sweep operational observability

- Adds structured success/failure logs for the reminder sweep with stage labels, scan/queue counts, and duration; log fields avoid task titles, recipient identifiers, tokens, and provider error details.
- Adds duration to the non-cached success response so trusted scheduler monitoring can track latency and workload.
- Adds API-CI guardrails for operational metrics and PII-minimized failure logs. Reminder execution still requires owner-configured private secrets and a trusted scheduler; no deployment is triggered.

## v0.2.67 — Monitoring and incident response runbook

- Adds operator guidance for API/web/database/provider monitoring, alert triage, incident evidence, credential rotation, and recovery escalation.
- Documents that alerts, provider settings, credentials, and incident contacts must be configured and tested in owner-controlled accounts; no deployment or credential change is performed.

## v0.2.66 — Database backup archive verification

- Adds a local-only helper that validates custom-format PostgreSQL backup archives with `pg_restore --list` and emits a SHA-256 checksum without printing the path or archive contents.
- Adds regression tests for missing, empty, symlinked, invalid, and valid test-fixture paths; no real backup data is checked into CI.
- Adds a recovery runbook covering provider retention review, isolated restore drills, RLS/grant checks, and evidence capture. No database migration, backup, restore, or deployment is triggered.

## v0.2.65 — Deployment smoke checks

- Adds a dependency-free post-deployment smoke check for API liveness/readiness and optional web homepage availability.
- Adds automated tests for endpoint status, network errors, malformed URLs, and embedded URL credentials.
- Documents safe use and the limits of smoke checks; no deployment is triggered and public launch remains owner-gated.

## v0.2.64 — Reject blank CORS origins in readiness probe

- Tightens `/ready` so a CORS origin list containing only empty or whitespace entries is treated as incomplete configuration.
- Adds a regression test for blank origin entries and clarifies the health-check documentation.
- No new secrets, network calls, database migrations, or deployment actions.

## v0.2.63 — API configuration readiness probe

- Adds a public `/ready` endpoint that returns 503 when the API lacks Supabase auth-verifier or CORS configuration, while keeping `/health` as a simple liveness probe.
- Adds tests for missing and present configuration and documents probe semantics and limitations.
- The readiness check makes no network calls and does not claim provider/database connectivity; no migration or secret values are added.

## v0.2.62 — Accurate capability and deployment configuration docs

- Reconciles the README with the implemented workspace, assistant, approval, notification, rate-limit, and provider guardrails while clearly separating CI evidence from live acceptance.
- Declares the Resend webhook and reminder cron secrets in the Render blueprint as owner-supplied private variables; no secret values or deployment actions are added.
- Updates package and build-status metadata. Public deployment remains deferred.

## v0.2.61 — Configuration preflight checks

- Adds a dependency-free preflight for web/API environment-variable presence and obvious placeholders without printing secret values or making network requests.
- Adds a production-profile check for private integration secrets and flags sensitive names incorrectly prefixed with NEXT_PUBLIC_.
- Adds Node test coverage and runs it in web CI; updates package metadata and setup documentation.
- Preflight is a sanity check only; it does not replace live provider, database, RLS, or deployment acceptance tests.

## v0.2.60 — Production-readiness evidence and release gate

- Adds a release-readiness checklist for live tenant-isolation acceptance, provider integrations, scheduler monitoring, backups/recovery, and launch approval.
- Corrects v0.2.59 status to merged and separates code/CI completion from live acceptance and production readiness.
- Updates package metadata to 0.2.60. No runtime behavior, migration, or new secret changes.
- Public deployment remains deferred pending owner approval and completion of release gates.

## v0.2.59 — Organization-isolation regression guardrails

- Adds API-CI regression tests for organization-scoped read-only assistant queries, recipient- and organization-scoped notification mutations, and organization-bound atomic approval execution.
- Documents a two-organization, multi-role live acceptance checklist covering cross-tenant reads and writes, suspended memberships, notifications, and approval execution.
- No runtime behavior, database schema, migration, or external secret changes. Source-level tests do not replace live RLS and multi-account acceptance testing.
- Public deployment remains deferred.

## v0.2.58 — Bound email-MFA verification request bodies

- Caps owner email-MFA verification requests at 4,096 bytes before JSON parsing, including chunked requests without a declared content length.
- Rejects oversized Content-Length early and cancels streamed bodies once the limit is crossed.
- Keeps same-origin checks, authenticated-owner checks, session-bound one-time challenges, atomic failed-attempt tracking, and timing-safe code comparison intact.
- Adds regression coverage and updates the package/build metadata. API tests, web lint, and production build must pass before merge.
- No database migration or new secret. Public deployment remains deferred.

## v0.2.57 — Bound Resend webhook body reads

- Rejects declared oversized payloads before reading the request body and incrementally caps chunked/undeclared payloads at 256,000 bytes.
- Cancels the request stream as soon as the cap is exceeded instead of buffering an arbitrarily large body before checking its size.
- Keeps signature verification, timestamp validation, event validation, and the database RPC boundary unchanged.
- Adds regression guardrails and updates package/build metadata. API tests, web lint, and production build must pass before merge.
- No database migration or new secret. Public deployment remains deferred.

## v0.2.56 — Reconcile retried unmatched Resend webhooks

- Fixes a delivery-status race where a webhook received before its email ledger row was matchable remained permanently unmatched, even when Resend retried the same event.
- Previously unmatched events can now be reprocessed safely; already processed event IDs remain idempotent.
- Preserves signature checks, event-row locking, status precedence, and the existing service-role-only RPC boundary.
- Adds migration 0033, regression guardrails, and rollout/acceptance documentation. Migration 0033 has been applied to the connected Supabase project and its RPC access controls verified; real Resend webhook retry tests are still required before production reliance.
- Public deployment remains deferred.
## v0.2.55 — Email provider diagnostic rate limits

- Limits the owner-only Resend connection test to 3 requests/minute and 10/hour per owner account.
- The shared rate-limit check runs before contacting Resend and fails closed when protection is unavailable.
- Adds regression tests, user-facing feedback, and setup documentation. Reuses migration 0032; no new schema or external secret.
- Approved email delivery keeps its separate idempotency and retry controls. Public deployment remains deferred.

## v0.2.54 — Approval request rate limits

- Applies shared atomic per-user limits to direct approval requests and assistant-generated proposals: 3/minute, 10/hour, and 30/day.
- Both entry points share the same rate-limit buckets, preventing bypass by switching forms; failed protection checks fail closed before request insertion.
- Adds API-CI guardrails and setup documentation. Reuses migration 0032; no new database migration or external secret is required.
- Approval requests remain proposals only and still require the existing owner-review workflow. Public deployment remains deferred.

## v0.2.53 — Team invitation throttling and duplicate protection

- Adds shared atomic per-owner limits of 5 invitations/minute, 20/hour, and 50/day before calling Supabase Auth email delivery.
- Checks the organization invitation ledger for an existing pending invitation and known active member before sending another invitation.
- Fails closed when rate-limit storage is unavailable and adds clear UI feedback plus API-CI source guardrails.
- Reuses migration 0032 from v0.2.52; no new database migration or external secret is introduced. Supabase Auth email delivery and the existing server-only service-role key are still required.
- Public deployment remains deferred; live onboarding and multi-account acceptance tests are still required.

## v0.2.52 — Atomic assistant request rate limits

- Adds a private Supabase-backed atomic rate-limit ledger for assistant prompts and owner-only AI provider connection tests.
- Limits assistant requests to 12/minute and 100/hour per user; provider tests to 3/minute and 10/hour. Requests fail closed if the rate-limit service or migration is unavailable.
- Adds migration 0032 with a SECURITY INVOKER function, empty search path, and service-role-only execution; browser roles have no ledger grants.
- Adds API-CI regression checks and setup guidance. Applying migration 0032 and configuring SUPABASE_SERVICE_ROLE_KEY privately are required before using these protected actions.
- No public deployment is performed; live multi-user and provider tests remain required.

## v0.2.51 — Preserve assistant prompts when AI provider fails

- Saves a signed-in user's prompt to their private conversation before calling the external AI provider, so missing credentials, provider timeouts, and transient errors do not silently discard submitted text.
- Updates the conversation title when the prompt is saved and displays a truthful error message that distinguishes a saved prompt from a missing AI reply.
- Adds API-CI source regression coverage for persistence order. No database migration is required.
- API tests, web lint, and production build must pass before merge; live provider verification still requires a private Groq key.

## v0.2.50 — Fair bounded task reminder scans

- Splits the reminder sweep into independent overdue and upcoming-task queries, each capped at 250 rows, so a large overdue backlog cannot consume the entire due-soon scan.
- Prioritizes the most recently overdue tasks and nearest upcoming deadlines; returns per-category scan counts for monitoring.
- Adds regression checks for the separate bounds and updates scheduler setup guidance. No database migration is required.
- The cron endpoint still requires private secrets and a trusted scheduler; larger backlogs may need a later pagination/queue design.

## v0.2.48 — Explicit browser denial for delivery events

- Adds an explicit deny-all RLS policy for anon/authenticated roles on the private Resend event ledger, resolving the Supabase linter's RLS-enabled-without-policy notice without granting browser access.
- Keeps writes and event processing server-side; service-role-only grants remain unchanged.

## v0.2.47 — Verified email delivery status webhooks

- Adds a server-only Resend webhook endpoint that verifies Svix signatures over the exact raw body, enforces a five-minute timestamp window, and caps payload size.
- Processes delivered, bounced, and complained events through a transactionally idempotent database function; duplicate provider event IDs are harmless.
- Stores provider event identifiers in a private RLS-enabled ledger, with function execution restricted to the service role. Unknown event types are acknowledged but ignored.
- Configure RESEND_WEBHOOK_SECRET privately in the server environment and register the HTTPS webhook URL in Resend before delivery events are processed. No public deployment or secret is included.

## v0.2.45 — Consolidated notification insert policy

- Combines task-assignment and approval-decision notification inserts into one scoped RLS policy to avoid duplicate permissive-policy evaluation.
- Retains strict task/request matching, active membership checks, owner review checks, recipient binding, and deduplication keys.

## v0.2.44 — Approval decision notifications

- Notify the requester in the in-app inbox when an organization owner approves or rejects their approval request.
- Restrict approval-decision notification inserts to the owner who reviewed the matching request; recipients can only update the read timestamp.
- Record an audit event if notification creation fails without undoing the already-recorded approval decision.

## v0.2.43 — Notification foreign-key index

- Adds a covering index for the notification creator foreign key flagged by the Supabase performance advisor.
- No application behavior changes.

## v0.2.42 — In-app notifications and reminder worker

- Adds an organization-scoped notification inbox with unread counts and mark-read/mark-all-read actions.
- Creates a notification when a task is assigned to another active workspace member; the insert policy requires a matching task and organization.
- Adds a bearer-secret-protected cron endpoint that queues idempotent daily due-soon and overdue reminders for assigned, unfinished tasks. Requires `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY`; configure a trusted scheduler privately to activate it.
- Adds RLS and regression tests; notifications are private to the recipient and active organization membership.

## v0.2.41 — Explicit organization scope for task execution

- Passes the current organization ID to the execution RPC and filters the locked approval row by both request ID and organization ID.
- Prevents a crafted request ID from crossing the UI's active-organization boundary, even for a user who owns multiple organizations.
- Replaces the one-argument RPC with a two-argument SECURITY INVOKER function; execution stays owner-only and transactional.

## v0.2.40 — Atomic approved-task execution

- Moves approved internal task execution into a single PostgreSQL transaction using a SECURITY INVOKER RPC.
- Locks the approval row, rechecks owner membership, approval status, expiry, action type, and pending execution state inside the transaction.
- Creates the task and marks the approval successful atomically; database failures roll back both changes, avoiding orphaned tasks or stuck partial executions.
- Keeps execution privileges restricted to authenticated callers, with RLS still enforced; no SECURITY DEFINER or external integrations are used.
- Corrects approval-page copy to distinguish executable internal tasks from disabled external actions.

## v0.2.39 — Task approval allow-list fix

- Accepts create_task in both the manual approval request action and the assistant-proposal server action, matching the v0.2.38 UI and database constraint.
- No additional database migration is required; migration 0021 is already applied.

## v0.2.38 — Approval-gated workspace task execution

- Adds a narrowly scoped execution path for owner-approved create_task requests.
- Adds persisted execution states and timestamps; a conditional database update claims a request before creating the task to reduce duplicate execution risk.
- Records execution outcomes and audit events. Unsupported external action types remain non-executable; no email, messaging, calendar, or arbitrary assistant text is executed.
- Requires the matching Supabase migration before the new executor is enabled.

# Crestovia AI — Changelog

## 0.2.37 — Assistant proposals to approval queue (in progress)
- Users can explicitly submit an assistant response as a company action approval request, choosing a request category.
- The server verifies the response and conversation belong to the signed-in user, applies an allow-list, records an audit event, and sends the request to the existing owner-review queue. No external action is executed.
- No database migration is required. API and web CI must pass before merge; public deployment remains deferred.

## 0.2.36 — Read-only assistant tool guardrails (completed)
- Added regression coverage to keep the assistant workspace tool registry read-only, organization-scoped, user-scoped for assigned tasks, and bounded by query limits.
- No runtime behavior or database schema changes in this test-focused increment. CI must pass before merge; public deployment remains deferred.

## 0.2.35 — Owner-only live AI connection test (completed)
- Added an owner-only, server-side Groq connection test with a 10-second timeout, an 8-token maximum response, no conversation persistence, and safe error categories.
- Added status feedback to the assistant page and regression tests for owner-only access, timeout bounds, no-store requests, and secret handling.
- No database migration is required. API tests, ESLint, and Next.js production build passed; PR #9 merged into main. Public deployment remains deferred.


## 0.2.34 — AI provider readiness visibility (completed)
- The assistant page now reports whether a server-side GROQ_API_KEY is present without exposing the secret; it explicitly says that presence does not verify provider connectivity or credentials.
- Added private configuration instructions and source regression coverage. No external account or database migration is needed for this code increment.
- API tests, ESLint, and Next.js production build passed; PR #8 merged into main. No database migration was required. Public deployment remains deferred.


## 0.2.33 — Editable private memory
- Added owner-session-checked memory editing with title/content length limits, category allow-list validation, explicit user-scoped lookup/update predicates, and timestamp refresh.
- Added an inline edit form to the private-memory page and regression coverage for account scoping and validation.
- Assistant reads the updated saved-memory content on subsequent replies; no database migration or new secret is required.
- CI and production build must pass before merge. Public deployment remains deferred.


## 0.2.32 — Assistant account-isolation hardening
- Added explicit signed-in user filters to assistant conversation, message-history, and saved-memory reads, plus the conversation-title update. Supabase RLS remains the primary access-control boundary.
- Added source regression coverage to prevent these explicit account-scoping predicates from being accidentally removed.
- API CI, web lint, and production build are required before merge. Real multi-account acceptance tests remain required.
- No public deployment.

## 0.2.31 — Membership policy hotfix (completed)
- Follow-up migration 0020 removes the legacy membership bootstrap INSERT policy because migration 0019 already includes the same creator bootstrap condition in its consolidated policy.
- Applied migration 0020 to Supabase; the policy catalog confirms one INSERT policy on memberships. Security advisor has no findings; remaining performance notices are informational unused-index warnings.
- API tests, web ESLint, and Next.js production build passed; PR #5 merged into main.
- No public deployment.

## 0.2.30 — RLS policy consolidation (merged; rollout reviewed)
- Merged PR #4 after API tests, web ESLint, and Next.js production build passed.
- Applied migration 0019 to combine organization SELECT policies and replace overlapping owner FOR ALL policies with command-specific owner write policies.
- Post-migration review caught one remaining duplicate membership bootstrap INSERT policy; migration 0020 removes the legacy duplicate while retaining the combined creator bootstrap condition.
- Security advisor returned no findings. Performance advisor no longer reports overlapping policy warnings outside the membership INSERT duplication being fixed in v0.2.31.
- No public deployment.

## 0.2.29 — Foreign-key lookup performance
- Added additive indexes for 19 foreign-key lookup patterns flagged by the Supabase performance advisor, including organization-scoped composite relationships.
- Added a source regression test that verifies each expected index is represented and the migration is non-destructive.
- API tests and web lint/production build passed in GitHub Actions; PR #3 was merged to `main`.
- Applied the additive migration to the connected Supabase project and verified all 19 indexes exist. The performance advisor no longer reports unindexed foreign keys; security advisor remains clear.
- Remaining performance advisor findings include multiple permissive RLS policies and unused-index notices. No policies or existing indexes were changed; unused-index warnings require real workload data before any removal.
- No application runtime changes, data rewrites, or public deployment.

## 0.2.28 — Authentication and audit regression coverage
- Added source regression checks for cross-origin rejection, authenticated owner-only email-MFA request/verification, user/session-bound challenge lookup, expiry, atomic failed-attempt counting, and one-time challenge consumption before cookie issuance.
- Added audit-writer boundary checks and documented the live acceptance tests still required.
- Corrected approval regression test whitespace normalization so it actually normalizes SQL whitespace rather than matching a literal backslash sequence.
- No runtime behavior or database schema changed. Live multi-user and concurrency tests remain outstanding.

## 0.2.27 — Approval workflow guardrails
## 0.2.27 — Approval workflow guardrails
- Added automated regression checks for self-requested pending approvals, active membership checks, owner-only review, pending/unexpired request constraints, audit events, and the no-execution boundary.
- Added a security contract and real-account acceptance checklist for approval workflows.
- No database migration, external API key, or public deployment is needed for this increment. Live role-isolation acceptance tests remain required.

## 0.2.26 — Update MFA regression tests for atomic RPC
- Replaced an obsolete compare-and-set source test with checks for the server-only atomic failed-attempt RPC now used by the verification route.
- CI had correctly caught the stale assertion after v0.2.25; this increment fixes the test rather than weakening the runtime protection.
- No new database migration or secret is needed. No public deployment occurred.

## 0.2.25 — Atomic email-MFA failed-attempt counting
- Added a server-only PostgreSQL RPC to atomically increment failed email-code attempts and mark a challenge used at the fifth failure.
- Updated verification to use the RPC instead of compare-and-set updates; concurrent incorrect guesses now each count against the limit rather than one request losing a race.
- Applied migration 0017 and verified it is SECURITY INVOKER, executable only by service_role, and the Supabase security advisor reports no findings.
- Added source regression tests. Real concurrent HTTP tests and email delivery checks remain pending; no public deployment occurred.

## 0.2.24 — Atomic email-MFA challenge issuance
- Moved the per-user hourly limit, resend cooldown, prior-challenge invalidation, and challenge insertion into one PostgreSQL transaction guarded by a per-user advisory lock.
- Restricted the new SECURITY INVOKER RPC to the server-side service_role; anon and authenticated cannot execute it.
- This closes a race where simultaneous challenge requests could pass the previous read-then-insert rate-limit checks.
- Applied migration 0016 to the connected Supabase project and verified function privileges and security advisor results. Real email delivery tests remain pending.

## 0.2.23 — Concurrent email MFA attempt hardening
- Changed failed email-code attempts to use a database compare-and-set update keyed by the previously observed attempt count.
- Concurrent failed verification requests can no longer silently overwrite the same attempt counter; stale competing updates receive a conflict response.
- Added a CI regression check for the compare-and-set guard. Real email-provider and multi-request integration tests remain required.
- No new key, migration, or deployment is needed for this code change.

## 0.2.22 — Audit permission regression tests
- Added automated regression tests for the owner/admin-only audit SELECT policy, organization scoping, active membership requirement, and browser read-only grants.
- Added security documentation distinguishing source-migration tests from real-account RLS acceptance tests.
- API CI runs the new checks as part of its existing pytest suite. No API keys, database changes, or deployment are required.

## 0.2.21 — Align audit history database permissions
- Fixed the mismatch between the audit page's owner/admin role check and the database policy that allowed only owners to read audit logs.
- Added migration 0014 to allow active organization owners and admins to read their organization's audit records.
- Added migration 0015 to explicitly revoke all table privileges from anon/authenticated and grant authenticated SELECT only; the server-side service role retains write access.
- Applied the migration to the connected Supabase project and verified the active policy and security advisor.
- No public application deployment was performed. End-to-end role testing with separate owner/admin/member accounts remains required.

## 0.2.20 — Audit history and workspace event logging
- Added an owner/admin-only audit history page with action filtering and a bounded recent-event view.
- Added best-effort server-side audit events for project/task/department changes, task comments, project membership changes, team access changes, and approval request creation/review.
- Audit writes use the server-only Supabase admin client and never include comment bodies or long free-text content in metadata.
- Existing organization and invitation events remain available. The viewer warns that early history may not cover every prior change.
- No schema migration or public deployment was performed. Audit event writes require private service-role configuration; real-account verification remains required.


## 0.2.19 — Permission-aware read-only assistant tools
- Added an explicit allow-list of read-only workspace tools for workspace overview and the signed-in user's assigned tasks.
- Assistant context uses the authenticated Supabase client and existing row-level security; query results are bounded and labeled as partial where applicable.
- Workspace context is only fetched when the user's latest message asks about workspace/company work, projects, tasks, deadlines, approvals, or their assigned tasks.
- Tool results are passed as untrusted data to the model. No write tools, arbitrary SQL, shell, external integrations, or approval execution are available.
- Updated assistant UI language to describe the read-only capability accurately. No schema migration, new API key, or deployment was required.
- Validation and real-account acceptance tests remain required; no public deployment was performed.


## 0.2.18 — Invitation tracking, acceptance, and revocation
- Connected the existing organization_invitations table to the owner invitation workflow, recording email, invited user, inviter, organization role, and status.
- Added a Pending Invitations table to Team Access with owner-only revocation controls.
- Revoking a pending invite marks the invitation revoked and suspends the still-invited membership, so the account does not gain workspace access from that invitation.
- Invitation acceptance updates the tracking row and membership state; legacy invitations without a tracking row can still use the existing acceptance path.
- Added migration 0013 to allow the full supported organization role set in tracked invitations.
- Applied and verified the role-constraint migration in the connected Supabase project; the Supabase security advisor returned no findings.
- No public deployment was performed.


## 0.2.17 — Department management and project organization
- Added a departments workspace with create, edit, and delete flows for owners, admins, and managers, subject to Supabase RLS.
- Added project counts per department and clear handling when a department is deleted (projects are preserved and become unassigned).
- Connected department selection to owner-only project creation and display department labels on project cards.
- Added dashboard and workspace navigation to departments.
- Kept all reads and writes on the authenticated Supabase client; no service-role key or new external API is needed for department management.


## 0.2.16 — Daily briefing foundation
- Added a workspace-aware daily briefing for overdue tasks, due-today and upcoming deadlines, blocked/in-progress tasks, projects, pending approval requests, and recent activity.
- Kept briefing reads on the authenticated Supabase client so row-level security scopes results to each user.
- Added timezone-aware date grouping with a safe fallback and dashboard navigation.
- The briefing is read-only and deterministic; it requires no AI key and cannot execute actions.
- Synced the already-applied organization invitation tracking table into migration history; the table is groundwork and is not yet wired into invitation UI flows.

## 0.2.15 — Owner approval queue foundation
- Added an RLS-protected action approval request queue for team members to request owner review.
- Added owner approve/reject decisions with optional review notes and expiry metadata.
- Added a dashboard approvals page. Approval decisions are records only; no external actions execute from this queue yet.

## 0.2.14 — Email-code owner MFA
- Added a custom email second-factor challenge for the verified owner email, with 6-digit codes, 10-minute expiry, one-minute resend cooldown, five-attempt hourly limit, keyed code hashes, one-time consumption, and session-bound HttpOnly signed cookies.
- Added server-only challenge storage with RLS and explicit deny policies for browser roles.
- Added Resend email delivery adapter and private environment placeholders. Email delivery is not active until the owner configures the service-role key, APP_MFA_SECRET, Resend API key, and verified sender address in provider secrets.
- Authenticator-app TOTP remains a fallback. The email provider setup and real-account tests are still required.

## 0.2.13 — Invitation acceptance flow
- Added owner invitation initiation through Supabase Auth using a server-only admin client.
- Added invited-membership acceptance on onboarding and a narrow RLS policy allowing invitees to read the organization name for their pending invitation.
- Added an audit event for invitation acceptance and kept invited members blocked from project access until their membership becomes active.
- Invite delivery requires the private service-role key and Supabase Auth email settings; end-to-end email delivery remains unverified.

## 0.2.11 — Private assistant chat and memory foundation
- Added private per-user assistant conversations and messages with RLS isolation.
- Added private memory CRUD screens, also isolated by user ID.
- Added a server-side Groq provider adapter and assistant chat UI; a private GROQ_API_KEY is required before replies work.
- Applied migration 0007 to Supabase and verified RLS is enabled on all three assistant tables.
- No tools or external actions are enabled in the AI chat yet.

## 0.2.10 — RLS-enforced organization bootstrap
- Replaced the SECURITY DEFINER organization-creation RPC with a SECURITY INVOKER function and explicit RLS-constrained first-owner policies.
- Verified the function is no longer SECURITY DEFINER and the Supabase security advisor reports no current security lints.
- Authenticated onboarding test remains pending.

## 0.2.9 — Owner-enforced authenticator MFA
- Added account-security page to enroll, verify, list, and remove TOTP authenticator factors.
- Added login challenge for owners with a verified factor and server-side AAL2 checks on owner dashboard, project, team, and write-action paths.
- Added frontend lint/build CI and corrected flat-config import/export handling based on GitHub Actions feedback.
- Email-delivered second-factor codes remain a separate custom integration; this version uses authenticator-app TOTP and does not claim to meet the email-code preference yet.

## 0.2.8 — Workspace write flows and owner team controls
- Added owner-only project creation.
- Added task creation with project, priority, optional assignee, and due date.
- Added task status updates, subject to database RLS.
- Added owner-only Team Access screen to review active members and assign/revoke project-level viewer, contributor, and manager access.
- Added owner controls to change existing non-owner organization roles and suspend/reactivate memberships.
- Added a web CI workflow for ESLint and Next.js production builds.

## 0.2.7 — Owner-only team administration hardening
- Restricted membership management and audit-log visibility to the organization owner.
- Added a non-exposed app_private.is_org_owner helper to avoid recursive membership RLS policies.
- Applied and verified the policy correction in Supabase; full real-user owner/member testing remains pending.

## 0.2.6 — Owner privacy and project-scoped team access
- Added owner-private data storage protected by user-id RLS.
- Added explicit project membership with viewer/contributor/manager access levels; only the organization owner can assign access in the database.
- Replaced broad workspace read policies with owner-or-assigned-project access policies.

## 0.2.5 — Security and release requirements
- Added owner access, MFA, tenant isolation, rate-limit, audit, backup, AI approval, and launch-gate plan.
- Deferred public deployment until features and security acceptance tests are complete and the owner explicitly approves launch.
- AI API keys will be requested only when provider integration begins and must be configured as secrets, never pasted into chat or committed.

## 0.2.4 and earlier
See the Git history for prior foundation, workspace schema, and free-hosting preparation.

## Update policy
Preserve existing work, add a changelog entry, test available checks, verify database/deployment changes, never commit secrets, and deliver a cumulative ZIP for meaningful updates.
