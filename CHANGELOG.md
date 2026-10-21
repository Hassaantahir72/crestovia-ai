## v0.2.56 — Reconcile retried unmatched Resend webhooks

- Fixes a delivery-status race where a webhook received before its email ledger row was matchable remained permanently unmatched, even when Resend retried the same event.
- Previously unmatched events can now be reprocessed safely; already processed event IDs remain idempotent.
- Preserves signature checks, event-row locking, status precedence, and the existing service-role-only RPC boundary.
- Adds migration 0033, regression guardrails, and rollout/acceptance documentation. Supabase migration application and live Resend webhook verification are required before this protection is active in production.
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
