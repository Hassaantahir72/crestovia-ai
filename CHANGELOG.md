# Crestovia AI — Changelog

## 0.2.4 — GitHub source upload and auth configuration fix

- Uploaded the complete source tree to the private GitHub repository `Hassaantahir72/crestovia-ai`.
- Applied foundation and company-workspace migrations to the connected Supabase project; verified all nine public tables have RLS enabled.
- Fixed middleware to accept the configured Supabase publishable key, with legacy anon-key fallback.
- Updated build and deployment documentation with the verified GitHub/Supabase state.
- API tests pass (2). Frontend build, real-user auth/RLS tests, and live hosting remain pending.

## 0.2.3 — Supabase schema applied

- Applied the foundation and company-workspace schemas to the connected Supabase project.
- Verified all nine expected tables exist; reviewed Supabase security/performance advisor findings.

## 0.2.2 — First live preview preparation

- Added Render Free Blueprint `render.yaml`, Node.js engine range, and beginner deployment guide.
- Removed the localhost API link from the public landing page.

## 0.2.1 — Free-first hosting preparation

- Added hosting plan, secrets policy, and GitHub Actions API test workflow.

## 0.2.0 — Company workspace foundation

- Added departments, projects, tasks, comments, activity tables and organization-scoped RLS.
- Added read-only project and task screens and setup/verification documentation.

## 0.1.x — Phase 1 foundation

- Added Next.js frontend, Supabase Auth helpers, organization onboarding, FastAPI API, migrations, tests, and setup documentation.

## Update policy

Preserve existing work, add a changelog entry, test available checks, verify database/deployment changes, never commit secrets, and deliver a cumulative ZIP for meaningful updates.
