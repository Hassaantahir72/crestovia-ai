# Crestovai AI — Company Operating System

Crestovai AI is a private company-operations workspace built with Next.js, FastAPI, and Supabase. The project is actively developed; it is **not yet production-ready**, and public deployment remains deferred until the owner explicitly approves launch.

## Implemented capabilities

- Authentication, protected workspace, organization onboarding, team roles, invitations, and department/project/task workflows.
- Organization-aware access controls and Supabase row-level security (RLS), with regression guardrails in CI.
- Owner email-code second factor when configured, with authenticator-app TOTP fallback.
- Private AI assistant conversations and editable saved memories, backed by a server-side Groq adapter.
- Read-only assistant workspace tools and a review queue for proposed work.
- Owner-approved internal task execution through a scoped, transactional database function; external actions remain separately gated and are not implied by approval.
- Daily briefing, in-app notifications, bounded reminder scans, and a secret-protected reminder endpoint.
- Resend email delivery integration scaffolding, signed webhook verification, delivery-event reconciliation, and retry controls.
- Rate limits for sensitive assistant, invitation, approval, and provider-diagnostic operations.
- Audit history and server-side configuration preflight checks.
- Deployment smoke checks, local backup archive verification, and operator runbooks for recovery and incident response.

Operational guidance: `docs/operations/MONITORING_INCIDENT_RESPONSE.md` and `docs/deployment/BACKUP_RESTORE_RUNBOOK.md`.

## Verification and limitations

CI covers API regression tests, web configuration-preflight tests, ESLint, and a Next.js production build. These checks do **not** prove live credentials, provider delivery, real-account MFA, deployed RLS behavior, or cross-organization isolation. See `docs/PRODUCTION_READINESS.md` and `docs/security/ORG_ISOLATION_ACCEPTANCE.md` for required live acceptance work.

## Setup

Start with:

- `docs/supabase/BEGINNER_SETUP.md`
- `docs/security/TEAM_ACCESS_MODEL.md`
- `docs/security/SECURITY_AND_RELEASE_PLAN.md`
- `docs/deployment/LIVE_PREVIEW_SETUP.md`
- `docs/deployment/CONFIGURATION_PREFLIGHT.md`
- `docs/AI_PROVIDER_SETUP.md`

Use `npm run preflight` in `apps/web` to check basic web configuration. Use `npm run preflight:production` to check for the expected private integration variables before a controlled release. These commands check variable names and obvious placeholders only; they never print values, call providers, or verify credentials. Do not paste secrets into chat or commit them.

## Private configuration

Depending on enabled features, server-side configuration includes `SUPABASE_SERVICE_ROLE_KEY`, `APP_MFA_SECRET`, `GROQ_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`, and `CRON_SECRET`. Browser-exposed `NEXT_PUBLIC_*` variables must contain public values only. Never expose service-role keys, API tokens, MFA secrets, webhook secrets, or cron secrets through browser variables.

## Deployment policy

No public deployment is authorized by this repository update. The Render blueprint is configuration only; required secret values, provider/webhook registration, trusted scheduling, live tenant-isolation acceptance, monitoring, and backup/restore validation still need owner-controlled setup. **Public deployment remains deferred until the owner explicitly approves it.**
