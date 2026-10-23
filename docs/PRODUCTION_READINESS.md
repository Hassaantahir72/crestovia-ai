# Crestovia AI — Production Readiness Gate

This checklist is the release gate for the private Crestovai AI deployment. A source-code merge or a green CI run is not proof that a live integration is configured correctly. Do not deploy publicly until the owner explicitly approves launch.

**Current state:** Not release-ready by assertion.

## Gate A — automated source and build checks

- [x] API test workflow passes on candidate commit `f2aed9081944a79cfc35f95f3879a2e9bbcee96f` (workflow run [39959386670](https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39959386670)).
- [x] Web ESLint, TypeScript type-check, and Next.js production build pass on candidate commit `f2aed9081944a79cfc35f95f3879a2e9bbcee96f` (workflow run [39959386453](https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39959386453)).
- [ ] Complete source archive is generated from the exact release commit and passes ZIP integrity and secret-pattern checks. The queried current candidate runs returned no artifacts; archive remains unverified.
- [ ] Database migrations are reviewed, applied to the intended environment, and their grants/policies verified.
- [ ] No secrets, tokens, local environment files, or production data are included in the source archive.

## Current candidate evidence — 2026-10-23

- Candidate commit: `f2aed9081944a79cfc35f95f3879a2e9bbcee96f`.
- Web CI completed successfully: locked dependency installation, regression checks, configuration preflight, smoke tests, helper tests, readiness checklist validation, ESLint, TypeScript, and Next.js production build all passed.
- API CI completed successfully. These are automated source/build checks, not live integration acceptance.
- Render preview service `crestovia-ai` reports candidate commit `f2aed9081944a79cfc35f95f3879a2e9bbcee96f` live at https://crestovia-ai.onrender.com. This confirms the platform's deployment status, not interactive browser acceptance.
- UI additions in the candidate include the illustrated assistant avatar, a dashboard-wide launcher that links to the assistant page, browser speech-to-text where supported, and read-aloud controls. A follow-up commit improves speech recognition continuity, cleanup, and microphone error guidance; it still requires CI and browser acceptance.
- Voice input uses browser speech recognition and now lets the user choose browser language, English (US), English (UK), or Urdu (Pakistan). It is intended for normal-volume speech, but actual recognition remains browser/device/network dependent. The app cannot directly set Web Speech API microphone gain/sensitivity; if normal speech is missed, check OS input level, selected microphone, distance/obstructions, site permission, and background noise. Verify these options on the target device before release.
- Latest voice diagnostic updates: commits `cd76683e283cfaa2e2741ef3536671936a40fd05` and `ec813a0faabf6b1cc955cff532dfb6f73fa64563` add an opt-in live microphone-signal meter, Windows input-level guidance, startup/error handling, and cleanup when the assistant page closes. This checks audio reaching the browser; it cannot change system gain or guarantee speech recognition. These changes have not yet passed a fresh production build or browser acceptance test.
- The launcher is a navigation shortcut, not an embedded chat overlay. Speech-to-text is user-initiated browser functionality, not an always-listening wake-word assistant.

## Gate B — organization and role isolation

Use two separate organizations and at least an owner, an administrator/manager, and a regular member in each organization.

- [ ] Organization A users cannot read or mutate Organization B projects, tasks, departments, conversations, notifications, approvals, audit records, or membership details.
- [ ] A user who belongs to both organizations sees only the currently selected organization’s records and cannot reuse stale organization context.
- [ ] Suspended or revoked memberships cannot access organization resources or execute approvals.
- [ ] Approval execution uses the approved request’s organization and rechecks current membership/authorization atomically.
- [ ] Read, create, update, delete, and export paths are tested, including direct API requests rather than only UI navigation.
- [ ] RLS policies and RPC execute grants are checked in the live database; source-level tests alone are insufficient.

## Gate C — AI provider

- [ ] A valid Groq configuration completes a real assistant request in the deployed environment.
- [ ] Missing, invalid, timed-out, rate-limited, and provider-error responses fail safely without leaking keys or internal diagnostics.
- [ ] Assistant memory and workspace tools are scoped to the active user and organization.
- [ ] Read-only tool calls remain read-only; consequential actions require explicit approval.
- [ ] Provider limits and user-visible error states are exercised with real accounts.

## Gate D — email and reminders

- [ ] Resend connection diagnostic succeeds only for an authorized owner and respects its shared rate limits.
- [ ] A real message delivery is recorded; signed webhook events are accepted, duplicate events remain idempotent, and unmatched events reconcile after delivery records exist.
- [ ] Invalid signatures, stale timestamps, oversized payloads, and unauthorized requests are rejected.
- [ ] Cron endpoint is configured with a strong private secret in the hosting platform, and unauthenticated calls are rejected.
- [ ] Reminder schedule, timezone behavior, bounded scan sizes, duplicate suppression, failures, and recovery after a missed run are tested.
- [ ] Monitoring alerts identify repeated cron failures and email delivery failures without exposing sensitive payloads.

## Gate E — recovery and operations

- [ ] Database backup/PITR availability and retention are confirmed for the chosen Supabase plan.
- [ ] A restore drill into a non-production environment has been completed and documented.
- [ ] Rollback procedure identifies the last known-good application commit and safe database migration strategy.
- [ ] Logs and alerts are available for application errors, provider failures, cron failures, and database errors.
- [ ] Incident contacts, credential rotation steps, and a process for revoking compromised sessions are documented.

## Gate F — launch authorization

- [ ] All applicable checks above have evidence and an owner.
- [ ] Remaining known limitations are reviewed and accepted.
- [ ] The owner explicitly approves public deployment.

**Current state:** Not release-ready. Automated code/build checks pass and the preview is reported live, but the source archive, real-account acceptance, live integrations, tenant-isolation acceptance, recovery drill, and launch authorization remain outstanding. Keep public launch deferred until these gates are completed and explicitly approved.


## Security hardening phase 1 — 2026-10-23 follow-up

- [x] Security branch `security/company-hardening-v1` contains baseline web/API security headers, production API docs disabled, stricter API readiness checks, regression tests, CodeQL, Dependabot, and the security audit.
- [x] API validation, web lint/type-check/production build, and CodeQL JavaScript/TypeScript plus Python jobs passed after the readiness-report parser fix (web run [39968687848](https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39968687848), API run [39968687985](https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39968687985), CodeQL run [39968687556](https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39968687556)).
- [x] Read-only staging catalog verification confirms migration 0035 RPC exists as SECURITY INVOKER, denies EXECUTE to anon/authenticated, grants EXECUTE to service_role, and the referenced tasks/notifications columns and constraints exist.
- [x] A candidate full-source ZIP was generated by GitHub Actions and passed ZIP integrity, path, environment-file, and credential-pattern checks. Regenerate the archive again from the final approved release commit after all changes are complete.
- [ ] Run staging runtime acceptance with controlled test organizations, tasks, memberships, and reminder dedupe; current staging tasks and notifications tables are empty.
- [ ] Review and execute a production backup/restore drill and migration rollback plan.
- [ ] Apply production privilege migrations only after the controlled rollout is approved; no production database changes have been made.
- [ ] Enable leaked-password protection in production Supabase Auth and re-check the security advisor.
- [ ] Confirm Groq key and cron secret are set privately in Render; run live assistant and cron tests.
- [ ] Perform real-account cross-organization authorization tests and browser voice/assistant acceptance.
- [ ] Review MFA/session lifecycle, email/webhook delivery, alerting, storage policies, CSP/provider compatibility, and public repository visibility.
- [ ] Obtain explicit owner launch authorization after all applicable gates have evidence.

**Deployment status:** Render web and API services still track `chore/render-build-gates-api-service-v034`; the security branch is not deployed. The web service's latest live deploy is commit `0a90ae92527fe2ab87b40f48d9c4bf1dac460b2c`. Production remains unchanged.
