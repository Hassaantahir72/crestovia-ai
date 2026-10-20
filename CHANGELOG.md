# Crestovia AI — Changelog

## 0.2.27 — Approval workflow guardrails
- Added automated regression checks for self-requested pending approvals, active membership checks, owner-only review, pending/unexpired request constraints, audit events, and the no-execution boundary.
- Added a security contract and real-account acceptance checklist for approval workflows.
- No database migration, external API key, or public deployment is needed for this increment. Live role-isolation acceptance tests remain required.

# Crestovia AI — Changelog

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
