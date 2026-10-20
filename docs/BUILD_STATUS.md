# Crestovia AI — Current Build Status

**Project version:** 0.2.11  
**Milestone:** Owner privacy, scoped team access, workspace write flows, owner membership controls, and TOTP MFA enforcement  
**Status:** Source updates are pushed to the private GitHub repository. Supabase schema and RLS are applied. Real-user end-to-end permission tests and frontend production build remain in progress. Deployment is intentionally deferred until project completion and owner approval.

## Version 0.2.11 assistant increment

- Added private assistant conversations/messages and private memory tables with RLS enabled and authenticated-only grants.
- Added assistant chat and private memory UI, plus a server-side Groq provider adapter.
- AI replies remain inactive until GROQ_API_KEY is configured privately in the server environment. No tools/actions are enabled.

## Version 0.2.13 invitation increment

- Added owner-initiated email invitations using a server-only Supabase admin client.
- Added onboarding acceptance for invited memberships and a narrow organization-read policy for invitees.
- Acceptance activates only the current user's own invited membership and writes an audit event through the server-only admin client.
- Actual invitation delivery requires private server secrets and configured Supabase Auth email settings; real-account delivery tests are pending.

## Version 0.2.14 email MFA increment

- Added owner email-code request and verification routes with keyed OTP hashes, 10-minute expiry, resend cooldown/hourly limit, five-attempt cap, one-time consumption, and a signed HttpOnly cookie bound to the current Supabase session.
- Challenge storage is RLS-enabled, has no browser grants, and has an explicit deny policy for anon/authenticated roles; service-role access is server-only.
- Owner access accepts a valid email-MFA cookie or a verified TOTP factor at AAL2.
- Email delivery remains inactive until SUPABASE_SERVICE_ROLE_KEY, APP_MFA_SECRET, RESEND_API_KEY, and RESEND_FROM_EMAIL are configured privately.

## Included
- Next.js frontend with Supabase Auth, sign-in, protected dashboard, callback, sign-out, and organization onboarding.
- FastAPI health and authenticated identity endpoints.
- Supabase schema for organizations, profiles, memberships, audit logs, departments, projects, tasks, comments, activity, project assignments, and owner-private items.
- Owner-only project creation, task creation/status updates, owner team management, project-level assignments, and member suspension/role controls.
- Account security page with TOTP enrollment, verification, factor removal, login challenge, and server-side AAL2 checks on owner workspace pages and server actions.

## Verified
- Private GitHub repository: https://github.com/Hassaantahir72/crestovia-ai
- Supabase project crestovia-ai; all 15 public tables have RLS enabled.
- API tests: 2 passed on the latest locally available test run.
- Render and GitHub Actions YAML parsed successfully.
- GitHub web CI previously exposed ESLint configuration errors; these were corrected. Latest CI run must be checked before calling the frontend build verified.
- Local npm installation timed out in this environment; no claim of local frontend build success.
- No public deployment has been created.

## Security caveats
- TOTP authenticator MFA is implemented in the code. Owner routes and server actions require a verified factor and AAL2 session.
- Email-code second factor is implemented in code with keyed OTP hashes, expiry, rate limits, replay prevention, and a session-bound HttpOnly cookie. Email delivery is not active until private server secrets and a verified sender are configured and real-account tests pass.
- Invitation email, account invitation, real-user owner/member isolation, and session revocation workflows remain pending.
- Supabase security advisor returned no current security lint findings after migration 0006 converted the organization-creation RPC to SECURITY INVOKER and added RLS-constrained bootstrap policies. Real authenticated bootstrap testing is still required.

## Verified latest increment
- Migration 0007_private_assistant_conversations_and_memory is applied; all three assistant tables have RLS enabled and authenticated-only grants.
- Supabase security advisor currently returns no security lint findings after migration 0006.
- GitHub Actions frontend lint and production build passed on commit b04ffd7; the latest team-page change also passed on commit d7f4a1b. Local npm installation timed out in this environment, so the verified build is the remote CI build.

## Still pending
- Verify latest frontend lint and production build in GitHub Actions and fix any reported issues.
- Test with separate owner, unassigned member, viewer, contributor, and manager accounts across at least two projects.
- Implement email-code second factor if retained as the owner's required preference, secure invitations, audit events for membership changes, rate limiting, recovery, and session revocation.
- AI chat, persistent assistant memory, approvals, daily briefings, voice, integrations, and automation.
- Security review, backup/restore drill, and acceptance tests.
- Final hosting and deployment, only after the project is complete and owner approves release.

## Progress estimates
- Architecture/planning: 100%
- Phase 1 foundation: 80%
- Phase 2 workspace: 35%
- Phase 3 AI/memory/approvals: 18% (private chat and memory foundation; provider key and approval/tool systems pending)
- Phase 4 assistant/voice: 0%
- Phase 5 integrations: 0%
- Phase 6 automation/hardening: 0%
- Overall product implementation: approximately 35%

These are implementation estimates, not production-readiness claims. Public deployment is intentionally deferred until completion and owner approval.
