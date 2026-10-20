# Crestovia AI — Current Build Status

**Project version:** 0.2.8  
**Milestone:** Foundation + owner privacy + project-scoped access + owner team controls + project/task write flows  
**Status:** Workspace write flows and owner team access UI are now in GitHub. Supabase schema and RLS are applied. Real-user auth, multi-user tenant-isolation tests, frontend production build, MFA enforcement, and final deployment are pending. Deployment remains intentionally deferred until project completion.

## Included
- Next.js frontend with Supabase Auth helpers, sign-in, protected dashboard, callback, sign-out, and onboarding.
- FastAPI health and authenticated identity endpoints with Supabase JWKS validation.
- Supabase schema for organizations, profiles, memberships, audit logs, departments, projects, tasks, comments, activity, project assignments, and owner-private items.
- Owner-only private records and explicit project membership with viewer/contributor/manager access levels.
- Owner-only project creation, task creation/status updates, and team project-assignment UI.
- Organization-scoped RLS, environment templates, API tests, setup guides, and Render Free blueprint.

## Verified
- Private GitHub repository: https://github.com/Hassaantahir72/crestovia-ai
- Supabase project crestovia-ai; all 11 expected public tables have RLS enabled.
- Python API tests: 2 passed.
- Render configuration and frontend workflow YAML parse successfully.
- Local frontend dependency install timed out, so local lint/build has not been verified.
- GitHub Actions web lint/build result is pending.
- No public deployment has been created.

## Version 0.2.8 workspace increment
- Added owner-only project creation and task creation/status update server actions.
- Added owner-only Team Access screen to list active organization memberships and assign/revoke project-level access.
- Added GitHub Actions workflow to lint and build the Next.js frontend.
- Secure invitations and profile email display remain disabled until a trusted server-side invitation flow is implemented.

## Version 0.2.7 security increment
- Added migrations 0004_owner_only_membership_and_audit_access.sql and 0005_fix_membership_rls_recursion.sql.
- Membership administration and audit-log visibility are restricted to organization owners.
- Introduced app_private.is_org_owner to avoid a self-referencing membership RLS policy.
- Supabase recorded both migrations successfully; a null-user helper check returned false. Real owner/member session tests remain pending.

## Version 0.2.6 security increment
- Added migration 0003_owner_privacy_project_scoped_access.sql and docs/security/TEAM_ACCESS_MODEL.md.
- Replaced broad workspace reads with owner-or-explicitly-assigned project access.
- Added owner_private_items, isolated by owner_id = auth.uid().

## Still pending
- Frontend dependency install, lint, and production build.
- Real-user sign-in, owner identity configuration, and organization onboarding.
- Test owner/member separation with two real test users and projects, including negative access attempts.
- Enforced MFA, owner-controlled invitations, organization role management, session revocation, rate limiting, and recovery.
- Security review, backup/restore drill, and acceptance tests.
- AI chat, memory/approvals UI, briefings, voice, integrations, and automation.
- Final hosting and deployment, only after the project is complete and owner approves release.

## Progress estimates
- Architecture/planning: 100%
- Phase 1 foundation: 75%
- Phase 2 workspace: 30% (schema, project/task write forms, owner assignment UI; invitations and full multi-user tests pending)
- Phase 3 AI/memory/approvals: 0%
- Phase 4 assistant/voice: 0%
- Phase 5 integrations: 0%
- Phase 6 automation/hardening: 0%
- Overall product implementation: approximately 24%

These are estimates, not production-readiness claims. Public deployment is intentionally deferred until completion and owner approval.
