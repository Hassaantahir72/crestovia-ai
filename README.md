# Crestovia AI — Phase 1 Foundation

A free-first starter for Crestovia AI: a shared company workspace with a Next.js frontend, FastAPI backend, and Supabase/PostgreSQL authentication and data foundation.

## Included
- Next.js App Router + TypeScript frontend and Supabase Auth helpers
- Protected dashboard, sign-in, callback, sign-out, and organization onboarding
- FastAPI health and authenticated /api/v1/me endpoints
- Supabase migrations for organizations, memberships, profiles, audit events, departments, projects, tasks, comments, activity, project assignments, and owner-private items
- Row Level Security policies, environment templates, tests, and free preview deployment instructions

## Status
This is foundation starter code, not a fully deployed production system. Real-user authentication, frontend build, cross-tenant security tests, MFA enforcement, and deployment remain pending. Review and test RLS with multiple test users before adding real company data.

## Setup
Read docs/supabase/BEGINNER_SETUP.md and docs/deployment/LIVE_PREVIEW_SETUP.md. Configure local environment files from examples. Never commit secrets.

## Owner and team security
Read docs/security/SECURITY_AND_RELEASE_PLAN.md and docs/security/TEAM_ACCESS_MODEL.md. Owner-private data is isolated from the shared company workspace. Team access to projects is explicitly assigned with viewer/contributor/manager levels. Assignment UI, MFA enforcement, and multi-user security tests are still pending.

## Deployment
The current blueprint is render.yaml. Public deployment is intentionally deferred until the project is complete, security and acceptance tests pass, and the owner explicitly approves launch.
