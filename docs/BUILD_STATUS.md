# Crestovia AI — Current Build Status

**Project version:** 0.2.30 (in progress)  
**Milestone:** RLS policy consolidation and performance warnings  
**Overall product implementation estimate:** approximately 48%  
**Deployment:** intentionally deferred until the product is complete and the owner explicitly approves launch.

## Version 0.2.30 — RLS policy consolidation (in progress)
- Prepared migration 0019 to remove overlapping permissive policies on departments, memberships, organizations, and project assignments while preserving owner writes, bootstrap membership creation, and scoped reads.
- Added source regression checks. CI and policy-equivalence review are pending; migration is not applied to Supabase.
- Public deployment remains deferred.

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
