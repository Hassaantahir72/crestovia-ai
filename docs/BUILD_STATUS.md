# Crestovia AI — Current Build Status

**Project version:** 0.2.3  
**Milestone:** Phase 1 foundation + Phase 2 read-only workspace + Supabase schema applied + free-first hosting preparation  
**Status:** The connected Supabase project has the expected schema. Frontend build, real-user auth flow, tenant isolation tests, GitHub source push, and live hosting remain unverified.

## Included

- Next.js App Router + TypeScript frontend
- Supabase browser/server auth helpers, sign-in, protected dashboard, sign-out, callback, and organization onboarding
- FastAPI `/health` and authenticated `/api/v1/me` endpoints with Supabase JWKS validation
- Foundation SQL: organizations, profiles, memberships, audit logs, RLS and organization bootstrap RPC
- Company workspace SQL: departments, projects, tasks, task comments, workspace activity, tenant-scoped foreign keys, indexes and RLS policies
- Read-only Projects and Tasks pages with empty/error states and dashboard links
- Beginner Supabase setup guide and SQL verification scripts for both migrations
- Environment examples, architecture notes, changelog and phase setup instructions

## This update (0.2.3)

- Applied the foundation and company-workspace schema to the connected Supabase project `crestovia-ai`.
- Live SQL verification confirmed all nine expected public tables exist.
- Added a connected-project record with the verified facts and remaining security/auth checks.
- GitHub source push and Render deployment are not complete.

## Previous update (0.2.2)

- Added Render free-tier Blueprint `render.yaml` for the Next.js web preview.
- Added beginner live preview setup guide with private GitHub repo creation, Supabase variables, Render deployment, and Auth redirect verification.
- Removed the landing page link to `localhost:8000`, which would not work for public visitors.
- No live deployment exists yet; GitHub repository creation and Render/Supabase account configuration are still required.

## Previous update (0.2.1)

- Added `docs/deployment/FREE_HOSTING_PLAN.md` with account ownership, deployment stages, secrets policy, and go-live checks.
- Added `.github/workflows/validate-api.yml` to run the existing FastAPI tests on GitHub pushes and pull requests.
- No GitHub, Cloudflare, or Supabase connector has been confirmed connected; no public deployment has been performed.

## Previous update (0.2.0)

- Added `database/migrations/0002_company_workspace.sql`. Apply it only after migration 0001 has succeeded.
- Added `/dashboard/projects` and `/dashboard/tasks` read-only pages.
- Added `docs/phase-2/WORKSPACE_SETUP.md` and `docs/supabase/VERIFY_COMPANY_WORKSPACE.sql`.
- Added responsive workspace navigation, task rows, status/priority labels, and empty/error states.
- Added company workspace migration/setup notes to README and changelog.

## Validation

- Python API tests: **2 passed** (`python -m pytest apps/api/tests -q`).
- Archive integrity: checked before delivery.
- Frontend dependency installation, lint, and production build: **not verified** in this update.
- Supabase schema: **applied** to the connected project; a live SQL check confirmed nine expected tables. Authentication onboarding and cross-organization RLS behavior have not yet been tested with real users.
- Cross-organization RLS behavior: policies are written but require testing with at least two organizations/users before production.

## Progress estimates

- Architecture and planning: 100%
- Phase 1 foundation: 70% (code and setup guide prepared; live migration/auth/RLS verification pending)
- Phase 2 company management: 18% (schema and read-only project/task pages; write workflows, member management, realtime and audit automation pending)
- Phase 3 AI, memory and approvals: 0%
- Phase 4 personal assistant and voice: 0%
- Phase 5 integrations: 0%
- Phase 6 automation and production hardening: 0%
- Hosting preparation: Render blueprint and deployment steps prepared; complete source push, Render configuration, Auth redirect setup and live URL pending.
- Overall product implementation: approximately 16%

Percentages are estimates of implementation scope, not a claim of production readiness.
