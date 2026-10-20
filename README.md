# Crestovia AI — Phase 1 Foundation

A free-first starter for Crestovia AI: a shared company workspace with a Next.js frontend, FastAPI backend, and Supabase/PostgreSQL authentication and data foundation.

## What is included

- Next.js App Router + TypeScript frontend
- Supabase Auth browser/server helpers
- Protected dashboard, sign-in page, and first-organization onboarding
- FastAPI health and authenticated `/api/v1/me` endpoints
- Supabase SQL migrations for organizations, memberships, profiles, audit events, departments, projects, tasks, comments, and activity
- Initial Row Level Security (RLS) policies and secure first-organization creation RPC
- Environment templates, tests, and free preview deployment instructions

## Important status

This is foundation starter code, not a fully deployed production system. Authentication and database access require environment configuration. Review and test RLS with multiple test users before adding real company data. The API validates Supabase access tokens against the project's JWKS endpoint.

## Requirements

- Node.js 20.9+ (use a currently supported LTS release)
- Python 3.11+
- Supabase project
- Git

## Setup

Read `docs/supabase/BEGINNER_SETUP.md` and `docs/deployment/LIVE_PREVIEW_SETUP.md`. Configure `apps/web/.env.local` and `apps/api/.env` using the example files. Never commit secrets.

### Frontend

```bash
cd apps/web
npm install
npm run dev
```

### API

```bash
cd apps/api
python -m venv .venv
# Activate the environment, then:
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Check `http://localhost:8000/health`.

## Security notes

- Supabase publishable keys may be used in the browser; never expose a secret/service-role key in client code.
- Keep API secrets server-side and out of Git.
- RLS is defense in depth, not a substitute for testing.
- Do not add real employee/client data until authentication and organization isolation are verified.

## Workspace increment

See `docs/phase-2/WORKSPACE_SETUP.md`. Projects and Tasks pages are currently read-only; create/edit flows and realtime updates are not yet implemented.

## Free-first preview

The current deployment blueprint is `render.yaml`. Follow `docs/deployment/LIVE_PREVIEW_SETUP.md` for a user-owned GitHub + Render + Supabase preview. Render Free sleeps after inactivity and is for preview/testing, not production uptime. No deployment is considered live until the URL and authentication are tested.
