# Crestovia AI — Current Build Status

**Project version:** 0.2.19  
**Milestone:** Read-only permission-aware assistant tools, tracked invitations and revocation, department management, owner/team access controls, private AI assistant, email-code MFA, approvals, and daily briefing  
**Overall product implementation estimate:** approximately 43%  
**Deployment:** intentionally deferred until the product is complete and the owner explicitly approves launch.

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
- Supabase schema migrations through 0013 are represented in source; all 17 public tables have RLS enabled. The organization_invitations table is wired into owner invite, acceptance, and revocation workflows; membership status remains the authorization gate for workspace access.

## Verification
- Private GitHub repository: https://github.com/Hassaantahir72/crestovia-ai
- Supabase security advisor last reported no security lint findings before this UI-only increment; re-check after future schema changes.
- Organization creation uses SECURITY INVOKER with RLS-constrained bootstrap policies.
- Python API tests: 2 passed on the prior verified increment.
- GitHub Actions frontend lint and production build passed for v0.2.18 application source at commit 2234cbe80a5443a0548ede2778bb6f77dc0582fc. The following commit only refreshes this status documentation.
- Local npm installation timed out in this environment; no local production build is claimed.
- No public application deployment has been created.

## Security implementation notes
- Owner dashboard, project, team, assistant, memory, approval, and write-action paths require email-MFA verification or a verified TOTP factor at AAL2.
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
- Verify email delivery, expiry, replay rejection, resend limits, wrong-code lockout, session binding, sign-out/session rotation, and TOTP fallback using real accounts.
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
- Phase 3 AI/memory/approvals: 30% (private chat/memory and approval-request queue foundation; provider secret, approval execution, and tool systems pending)
- Phase 4 assistant/voice/productivity: 10% (data-based daily briefing implemented; voice/reminders remain pending)
- Phase 5 integrations: 0%
- Phase 6 automation/hardening: 15% (MFA and RLS baseline implemented; security acceptance testing remains)

These are implementation estimates, not production-readiness claims.
