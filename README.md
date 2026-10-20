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


## Invitation acceptance (0.2.13)
Owners can initiate email invitations and invited users can accept them during onboarding. This requires SUPABASE_SERVICE_ROLE_KEY configured as a server-only secret and valid Supabase Auth email settings. Invite delivery and acceptance must be tested with real accounts before production.


## Email-code owner MFA (0.2.14)
The code now supports a short-lived, rate-limited email second factor with a TOTP fallback. To activate email delivery, configure SUPABASE_SERVICE_ROLE_KEY, APP_MFA_SECRET, RESEND_API_KEY, and RESEND_FROM_EMAIL as server-only secrets. Email delivery and real-account acceptance tests remain pending until those secrets and the sender are configured. Never share secrets in chat.


## Approval queue (0.2.15)
Team members can submit requests for owner review; owners can approve or reject with notes. This records the decision only. It does not execute external actions or grant AI tools.
