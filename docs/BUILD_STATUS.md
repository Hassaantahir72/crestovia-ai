# Crestovia AI — Current Build Status

**Project version:** 0.2.16  
**Milestone:** Owner/team access controls, private AI assistant foundation, email-code MFA, approvals, and daily briefing  
**Overall product implementation estimate:** approximately 39%  
**Deployment:** intentionally deferred until the product is complete and the owner explicitly approves launch.

## Version 0.2.16 — Daily briefing
- Added a workspace-aware daily briefing that summarizes overdue work, today's deadlines, the next seven days, blocked tasks, in-progress tasks, active projects, unexpired approval requests, and recent workspace activity.
- Briefing queries use the signed-in user's Supabase session and database RLS; team members see only tasks/projects/activity available to their account.
- Uses the account's saved timezone with a safe `Asia/Karachi` fallback for date grouping.
- Added direct links from the dashboard and briefing sections to the task board, projects, assistant, and approvals.
- The briefing is deterministic and data-based; it does not require an AI API key and does not execute actions.

## Current capabilities
- Next.js frontend, Supabase Auth, protected dashboard, sign-in, sign-out, callback, and onboarding.
- FastAPI health and authenticated identity endpoints.
- Owner-only project creation, task creation/status updates, task comments, member role/status controls, and project-level viewer/contributor/manager assignments.
- Owner-initiated Supabase Auth invitations and an onboarding acceptance flow for invited memberships.
- RLS-protected approval requests with owner approve/reject decisions; approvals are records only and do not execute external actions.
- Private per-user assistant conversations and saved memories, with a server-side Groq provider adapter and chat UI.
- Owner email-code second factor when private provider settings are configured, with authenticator-app TOTP as fallback.
- Data-based daily briefing with deadline, blocked-work, project, approval, and recent-activity summaries.
- Supabase schema migrations through 0012 are represented in source; all 17 public tables have RLS enabled. The organization_invitations table is applied but is not yet wired into the invite UI; membership rows remain the active invitation-state source.

## Verification
- Private GitHub repository: https://github.com/Hassaantahir72/crestovia-ai
- Supabase security advisor last reported no security lint findings before this UI-only increment; re-check after future schema changes.
- Organization creation uses SECURITY INVOKER with RLS-constrained bootstrap policies.
- Python API tests: 2 passed on the prior verified increment.
- GitHub Actions frontend lint and production build passed for the daily-briefing code on commit 7d7f0e16ca8cbff6fc7b94431a118038a2425f12; the subsequent schema-history sync is pending its own CI run.
- Local npm installation timed out in this environment; no local production build is claimed.
- No public application deployment has been created.

## Security implementation notes
- Owner dashboard, project, team, assistant, memory, approval, and write-action paths require email-MFA verification or a verified TOTP factor at AAL2.
- Email OTP codes are random six-digit values, hashed with a server-only secret, expire after 10 minutes, are invalidated after use, have a 60-second resend cooldown, a per-account hourly send limit, and a five-attempt cap.
- Successful email verification creates a signed HttpOnly cookie bound to the current Supabase session.
- Email challenge records are RLS-enabled, have no browser grants, and have an explicit deny policy for anon/authenticated roles. Only the server-side service-role client can access them.
- Invitation acceptance is restricted to the authenticated user's own invited membership; invited users remain blocked from workspace data until acceptance.
- Assistant chat has no tools or external-action capability. If enabled, recent chat and selected saved memories are sent to Groq for reply generation.
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
- Add a permission-checked AI tool registry and connect approvals to future allow-listed actions. No external action should execute merely because the model requested it.
- Add reminders/notifications, voice, integrations, and automation.
- Complete final security and user acceptance tests before deployment. No public deployment is authorized yet.

## Phase estimates
- Architecture/planning: 100%
- Phase 1 foundation: 85% (schema, auth scaffolding, safe organization bootstrap; real-account tests pending)
- Phase 2 workspace: 48% (project/task writes, comments, member controls, assignments, invitation acceptance; real-user testing pending)
- Phase 3 AI/memory/approvals: 25% (private chat/memory and approval-request queue foundation; provider secret, approval execution, and tool systems pending)
- Phase 4 assistant/voice/productivity: 8% (data-based daily briefing implemented; voice/reminders remain pending)
- Phase 5 integrations: 0%
- Phase 6 automation/hardening: 15% (MFA and RLS baseline implemented; security acceptance testing remains)

These are implementation estimates, not production-readiness claims.
