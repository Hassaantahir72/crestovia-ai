# Crestovia AI — Current Build Status

**Project version:** 0.2.15  
**Milestone:** Owner/team access controls, workspace collaboration, private assistant foundation, invitations, and email-code owner MFA  
**Overall product implementation estimate:** approximately 37%  
**Deployment:** intentionally deferred until the product is complete and the owner explicitly approves launch.

## Version 0.2.15 approval queue increment

- Added action_approval_requests with RLS: active members can request review, requesters and owners can read, and only owners can update decisions.
- Added an approval page for team requests and owner approve/reject decisions. Approval records do not execute external actions.
- Migration 0011 is applied to Supabase; CI passed for the approval queue and is checking the latest team-page refinement.

## Current capabilities
- Next.js frontend, Supabase Auth, protected dashboard, sign-in, sign-out, callback, and onboarding.
- FastAPI health and authenticated identity endpoints.
- Owner-only project creation, task creation/status updates, task comments, and owner controls for project assignments and existing member roles/status.
- Owner-initiated Supabase Auth invitations and an onboarding acceptance flow for invited memberships.
- RLS-protected approval queue for team requests and owner approve/reject decisions; approvals do not execute external actions.
- Project-level viewer, contributor, and manager assignments; owner-private records are isolated from team data.
- Private per-user assistant conversations and saved memories, with a server-side Groq provider adapter and chat UI.
- Owner account security supports email-code second factor when provider secrets are configured, with authenticator-app TOTP as fallback.
- Supabase schema migrations through 0011 are applied; all 16 public tables have RLS enabled.

## Verification
- Private GitHub repository: https://github.com/Hassaantahir72/crestovia-ai
- Supabase security advisor currently reports no security lint findings.
- Organization creation uses SECURITY INVOKER with RLS-constrained bootstrap policies.
- Python API tests: 2 passed.
- Render and GitHub Actions YAML validation passed locally.
- GitHub Actions frontend lint and production build passed on code commit 6012ac4. The only later source change was package version metadata; its workflow run is being checked.
- Local npm installation timed out in this environment, so the verified frontend build is the remote GitHub Actions build.
- No public application deployment has been created.

## Security implementation notes
- Owner dashboard, project, team, assistant, memory, and server-action paths require email-MFA verification or a verified TOTP factor at AAL2.
- Email OTP codes are random six-digit values, hashed with a server-only secret, expire after 10 minutes, are invalidated after use, have a 60-second resend cooldown, a per-account hourly send limit, and a five-attempt cap.
- Successful email verification creates a signed HttpOnly cookie bound to the current Supabase session.
- Email challenge records are RLS-enabled, have no browser grants, and have an explicit deny policy for anon/authenticated roles. Only the server-side service-role client can access them.
- Invitation acceptance is restricted to the authenticated user's own invited membership; invited users remain blocked from workspace data until acceptance.
- Assistant chat has no tools or external-action capability. If enabled, recent chat and selected saved memories are sent to Groq for reply generation.

## Required private configuration before real-world use
- SUPABASE_SERVICE_ROLE_KEY for invitation administration and email-MFA challenge storage.
- APP_MFA_SECRET (random value at least 32 characters) for email-code hashing and signed-cookie verification.
- RESEND_API_KEY and RESEND_FROM_EMAIL from a verified sender for email-code delivery.
- GROQ_API_KEY for AI replies; GROQ_MODEL is configurable.
- Configure these only in local private environment files or the hosting provider's secret settings. Never paste them into chat, commit them, or expose them through NEXT_PUBLIC_* variables.

## Remaining work
- Verify email delivery, expiry, replay rejection, resend limits, wrong-code lockout, session binding, sign-out/session rotation, and TOTP fallback using real accounts.
- Verify invitations end-to-end using a new test email and ensure Supabase Auth redirect URLs/email delivery are configured.
- Test owner, unassigned member, viewer, contributor, manager, and suspended-member access across at least two projects and multiple organizations.
- Finish audit coverage, rate limiting, recovery/session revocation, backup/restore drill, dependency/security review, and production acceptance tests.
- Add AI approvals/tool registry, daily briefings, voice, integrations, and automation. AI tools must remain allow-listed and approval-gated.
- Complete final security and user acceptance tests before deployment. No public deployment is authorized yet.

## Phase estimates
- Architecture/planning: 100%
- Phase 1 foundation: 85% (schema, auth scaffolding, safe organization bootstrap; real-account tests pending)
- Phase 2 workspace: 48% (project/task writes, comments, member controls, assignments, invitation acceptance; real-user testing pending)
- Phase 3 AI/memory/approvals: 25% (private chat and memory foundation; provider secret, approvals, and tool systems pending)
- Phase 4 assistant/voice: 0%
- Phase 5 integrations: 0%
- Phase 6 automation/hardening: 15% (MFA and RLS baseline implemented; security acceptance testing remains)

These are implementation estimates, not production-readiness claims.
