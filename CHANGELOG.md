# Crestovia AI — Changelog

## 0.2.0 — Company workspace foundation (Phase 2 start)

- Added additive migration `0002_company_workspace.sql` for departments, projects, tasks, task comments, and workspace activity.
- Added organization-scoped RLS policies and same-organization foreign-key constraints for departments, projects, task assignees, and comments.
- Added read-only Projects and Tasks pages with empty/error states, organization context, status/priority labels, and dashboard navigation.
- Added a company workspace verification SQL script and beginner migration guide.
- Updated dashboard copy and shared responsive workspace styles.
- Verified Python API tests: 2 passed. Frontend production build and remote Supabase migration remain unverified.

## 0.1.2 — Supabase setup and secure configuration

- Added beginner step-by-step guide for applying the existing migration and configuring local environment files.
- Added read-only SQL checks for expected foundation tables, organization RPC, and RLS activation.
- Updated frontend configuration to prefer the modern Supabase publishable key and retain legacy anon-key compatibility.
- Updated README and build status; live Supabase setup is still awaiting user verification.

## 0.1.1 — Incremental project handoff

- Preserved the existing Phase 1 starter implementation.
- Added first-organization onboarding and a database RPC that assigns the creator as owner.
- Added this changelog so future updates can be tracked cumulatively.
- Rebuilt the full project archive for handoff.

## 0.1.0 — Phase 1 starter

- Next.js frontend scaffold, sign-in page, protected dashboard, sign-out, and auth callback.
- FastAPI health endpoint and Supabase JWKS access-token validation.
- Initial PostgreSQL schema for organizations, profiles, memberships, and audit logs.
- Initial RLS policies, tests, environment examples, and setup documentation.

## Project update policy

Each meaningful update should:
1. Start from the latest project folder/archive, not from a blank scaffold.
2. Preserve working files and existing documentation.
3. Add a changelog entry describing what changed.
4. Run the checks available in the current environment and clearly list anything not verified.
5. Produce a new cumulative ZIP containing the whole project, with a versioned filename when practical.

## [0.2.1] - Free-first hosting preparation

- Added `docs/deployment/FREE_HOSTING_PLAN.md` with a staged plan for user-owned GitHub, Cloudflare Workers, and Supabase deployment.
- Documented owner access, secrets handling, free-tier caveats, auth redirect setup, deployment acceptance checks, and the decision not to use Vercel Hobby for a commercial company deployment without checking eligibility.
- Added a GitHub Actions workflow to run the existing FastAPI tests on pushes and pull requests.
- No provider accounts were connected and no live deployment was performed as part of this file update.


## [0.2.2] - First live preview preparation

- Added `render.yaml` to describe a free-tier Next.js web service with Supabase browser-safe environment variables.
- Added `docs/deployment/LIVE_PREVIEW_SETUP.md` with beginner steps for a private GitHub repository, Render Blueprint deployment, Supabase Auth redirects, and live acceptance checks.
- Removed the hard-coded localhost API health link from the public landing page so the deployed site does not point visitors to their own machine.
- Declared supported Node.js engine range for deployment consistency.
- No live deployment or Supabase migration was performed by this update.
