# Crestovia AI

Free-first company operating system starter using Next.js, FastAPI, and Supabase.

## Current capabilities
- Sign-in, protected dashboard, organization onboarding.
- Owner-only project creation, task creation/status updates, task comments, team role controls, and project-level access assignments.
- Department management and optional project-to-department assignment.
- Owner-managed tracked invitations with pending status, acceptance tracking, and revocation controls.
- Owner-private data isolation and database RLS policies.
- Owner email-code second factor when configured, with authenticator-app TOTP fallback.
- Private AI assistant chat and saved memories, with a server-side Groq adapter.
- Owner approval queue for proposed work; approvals do not execute external actions.
- Daily briefing for deadlines, blocked work, projects, approvals, and recent activity, scoped to data visible to the signed-in user.

## Still in development
Real-account MFA/invitation tests, permission-isolation acceptance tests, AI tool registry and approval execution, reminders/voice, integrations, automation, production hardening, and deployment. The project is not yet production-ready.

## Setup
See docs/supabase/BEGINNER_SETUP.md, docs/security/TEAM_ACCESS_MODEL.md, docs/security/SECURITY_AND_RELEASE_PLAN.md, docs/deployment/LIVE_PREVIEW_SETUP.md, and docs/AI_PROVIDER_SETUP.md. Never paste or commit secrets.

## Deployment policy
Public deployment remains deferred until the product is complete, security and acceptance tests pass, and the owner explicitly approves launch. No public deployment has been created.

## Required private configuration
- `SUPABASE_SERVICE_ROLE_KEY`, `APP_MFA_SECRET`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL` for server-side invitation and email-code MFA workflows.
- `GROQ_API_KEY` for AI assistant replies.
- These values belong only in private local environment files or provider secret settings, never in chat, GitHub source, or any `NEXT_PUBLIC_*` variable.

## Daily briefing (0.2.16)
The briefing is a read-only, data-based summary scoped by authenticated Supabase access rules. It does not require an AI provider key or execute actions. See `docs/phase-4/DAILY_BRIEFING.md`.
