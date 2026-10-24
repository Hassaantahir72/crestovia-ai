# Crestovia AI — Production Readiness Gate

This checklist is the release gate for the private Crestovai AI deployment. A source-code merge or a green CI run is not proof that a live integration is configured correctly. Do not deploy publicly until the owner explicitly approves launch.

**Current state:** Not release-ready.

Latest source/build CI is green, but real-account authorization tests, production recovery checks, provider setup, and owner approval are still required.

## Latest verification — 2026-10-24

- Candidate feature branch commit: `b523aedfdee95406f365f44d7e38bf2aae34be28` (fixes the SECURITY DEFINER regression test so each function is checked independently).
- API CI passed: [workflow run 40082151490](https://github.com/Hassaantahir72/crestovia-ai/actions/runs/40082151490).
- Web CI passed, including dependency install, regression/security tests, migration checks, configuration preflight, ESLint, TypeScript, and production build: [workflow run 40082151505](https://github.com/Hassaantahir72/crestovia-ai/actions/runs/40082151505).
- Staging Supabase project has migrations 0037–0040 applied. Live SQL checks confirm RLS is enabled on all five Team Chat/WhatsApp tables, the three scoped SECURITY DEFINER RPCs have an empty search path, anonymous users cannot execute them, authenticated users can execute them, anonymous users lack `public` schema USAGE, and `team_messages` is in `supabase_realtime`.
- Staging Team Chat and WhatsApp tables are empty. This confirms no test messages or staff phone mappings have been created; it does not replace acceptance tests with two real signed-in users.
- Production Supabase remains at migration 0033; migrations 0034–0040 have not been applied to production. Render production web/API services remain on their current release branch. No WhatsApp credentials were configured and no real WhatsApp message was sent.
- Remaining owner actions: create/use two test users in the same staging organization; enable Supabase leaked-password protection; confirm production backup/PITR and restore readiness; later supply Meta WhatsApp configuration directly in Render's private environment settings (never in chat).


## Gate A — automated source and build checks

- [x] API test workflow passes on candidate commit `f2aed9081944a79cfc35f95f3879a2e9bbcee96f` (workflow run [39959386670](https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39959386670)).
- [x] Web ESLint, TypeScript type-check, and Next.js production build pass on candidate commit `f2aed9081944a79cfc35f95f3879a2e9bbcee96f` (workflow run [39959386453](https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39959386453)).
- [ ] Complete source archive is generated from the exact release commit and passes ZIP integrity and secret-pattern checks. The queried current candidate runs returned no artifacts; archive remains unverified.
- [ ] Database migrations are reviewed, applied to the intended environment, and their grants/policies verified, including 0037–0040 for team chat/direct messages, WhatsApp event logging, Realtime publication, and foreign-key indexes. Staging migrations 0037–0040 are applied; production remains unchanged.
- [ ] No secrets, tokens, local environment files, or production data are included in the source archive.

## Previous candidate evidence — 2026-10-23

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
