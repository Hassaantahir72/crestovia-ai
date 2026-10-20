# Crestovia AI — Current Build Status

**Project version:** 0.2.7  
**Milestone:** Foundation + owner privacy + project-scoped access + owner-only membership/audit controls  
**Status:** GitHub source is pushed; Supabase schema and RLS are applied. Real-user auth, multi-user tenant-isolation tests, frontend production build, MFA enforcement, and final deployment are pending. Deployment remains intentionally deferred until project completion.

## Included
- Next.js frontend with Supabase Auth helpers, sign-in, protected dashboard, callback, sign-out, and onboarding.
- FastAPI health and authenticated identity endpoints with Supabase JWKS validation.
- Supabase schema for organizations, profiles, memberships, audit logs, departments, projects, tasks, comments, activity, project assignments, and owner-private items.
- Owner-only private records and explicit project membership with viewer/contributor/manager access levels.
- Organization-scoped RLS, environment templates, API tests, setup guides, and Render Free blueprint.

## Verified
- Private GitHub repository: https://github.com/Hassaantahir72/crestovia-ai
- Supabase project crestovia-ai; all 11 expected public tables have RLS enabled.
- Supabase migrations 0001–0005 recorded, including owner-private/project-scoped access and owner-only membership/audit policies.
- Python API tests: 2 passed; render.yaml parses; cumulative ZIP integrity verified.
- No public deployment has been created.

## Security increment 0.2.7
- Membership administration and audit-log visibility are restricted to organization owners.
- Added app_private.is_org_owner to avoid recursive membership RLS policies. A null-organization check returns false.
- Owner-private data is isolated by owner_id = auth.uid().
- Explicit project assignment controls team project/task access.

## Still pending
- Frontend dependency install, lint, and production build.
- Real-user sign-in, owner identity configuration, and organization onboarding.
- Test owner/member separation with two real test users and projects, including negative access attempts.
- MFA enforcement, owner-controlled invitation/project-assignment UI, session revocation, rate limiting, and recovery.
- Security review, backup/restore drill, and acceptance tests.
- AI chat, memory/approvals UI, briefings, voice, integrations, and automation.
- Final hosting and deployment, only after the project is complete and owner approves release.

## Progress estimates
- Architecture/planning: 100%
- Phase 1 foundation: 75%
- Phase 2 workspace: 22%
- Phase 3 AI/memory/approvals: 0%
- Phase 4 assistant/voice: 0%
- Phase 5 integrations: 0%
- Phase 6 automation/hardening: 0%
- Overall product implementation: approximately 21%

These are estimates, not production-readiness claims. Public deployment is intentionally deferred until completion and owner approval.
