# Crestovia AI

Free-first company operating system starter using Next.js, FastAPI, and Supabase.

## Current capabilities
- Sign-in, protected dashboard, organization onboarding.
- Owner-only project creation, task creation and task status updates.
- Owner team page for existing member roles/status and project-level viewer/contributor/manager assignments.
- Owner-private data isolation and database RLS policies.
- TOTP authenticator enrollment and AAL2 enforcement for owner workspace routes and server actions.

## Still in development
Secure invitations, the requested email-delivered second-factor code, multi-user isolation tests, AI assistant and memory, approvals, voice, integrations, automation, production hardening, and deployment. The project is not yet production-ready.

## Setup
See docs/supabase/BEGINNER_SETUP.md, docs/security/TEAM_ACCESS_MODEL.md, docs/security/SECURITY_AND_RELEASE_PLAN.md, and docs/deployment/LIVE_PREVIEW_SETUP.md. Never paste or commit secrets.

## Deployment policy
Public deployment remains deferred until the product is complete, security and acceptance tests pass, and the owner explicitly approves launch. No public deployment has been created.


## Assistant foundation (0.2.11)
Private chat history and memory are stored in user-isolated tables. The Groq provider adapter and chat UI are prepared, but assistant replies require GROQ_API_KEY configured as a server-only secret. No tools or external actions are enabled in this version.
