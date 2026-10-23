# Crestovia AI security hardening and release gates

**Status: security work in progress; not a certification or a statement that production is secure.**

This plan tracks controls that must be implemented and evidenced before Crestovia AI is approved for company-wide use. Passing source tests is not equivalent to a live penetration test.

## Controls added in this change

- Web responses receive baseline security headers: content-type sniffing disabled, framing denied, conservative referrer policy, and browser permissions restricted to the microphone for the web app.
- API responses receive baseline security headers and no-store caching.
- Production API readiness rejects wildcard CORS and non-HTTPS origins.
- API interactive documentation and OpenAPI schema are disabled in production.
- CodeQL static analysis is configured for TypeScript/JavaScript and Python.
- Dependabot weekly update checks are configured for npm, pip, and GitHub Actions.

## Required before company launch

### Identity and access
- [ ] Enable leaked/compromised password protection in Supabase Auth.
- [ ] Verify MFA enrollment, challenge expiry, replay prevention, lockout, recovery, session expiry, and revocation.
- [ ] Confirm server-side authorization for every privileged operation; never trust browser-supplied roles.
- [ ] Review account recovery, invitations, and owner/admin transitions.

### Database and tenant boundaries
- [ ] Reconcile production and staging migration history before applying any migration.
- [ ] Review production schema/table/function grants and default privileges, including anon, authenticated, and PUBLIC.
- [ ] Review every exposed table, view, RPC, and storage policy for row-level security and least privilege.
- [ ] Run two-organization negative tests against direct database/API access for reads, writes, deletes, exports, conversations, memory, notifications, files, invitations, and approvals.
- [ ] Take a verified backup and rehearse restore before any production DDL or privilege changes.

### AI and integrations
- [ ] Keep Groq, service-role, email-provider, webhook, and cron secrets server-side only.
- [ ] Confirm tool execution is authorized by server-side organization membership and action-specific permissions.
- [ ] Require explicit human approval for consequential actions and bind approval to the exact action payload.
- [ ] Test prompt-injection resistance using hostile content in documents, emails, and retrieved context.
- [ ] Enforce request limits, provider timeouts, token/cost limits, and safe error messages.
- [ ] Verify webhook signatures, timestamps, replay handling, and idempotency.

### Platform and operations
- [ ] Review repository visibility and enable appropriate branch protections and required CI checks.
- [ ] Make deployment behavior explicit: only reviewed commits should deploy to production.
- [ ] Verify no secrets exist in repository history, logs, build artifacts, or browser bundles; rotate any exposed credentials.
- [ ] Review CSP separately with the full app and provider integrations before enforcing it.
- [ ] Verify backup retention, access controls, restore procedure, monitoring, and alert delivery.
- [ ] Complete live browser acceptance tests and an independent security review.

## Current known external items

- Supabase production has previously reported leaked-password protection disabled. An authorized project owner must enable it in Supabase Auth settings and verify the resulting state.
- Production and staging migration counts differ. Do not apply staging migrations to production just to equalize counts; compare migration SQL and actual schema first.
- Render service settings must be reconciled with the intended release process. A repository Blueprint value does not prove that an existing service's dashboard configuration has changed.
- The real Groq connection test requires the owner to configure GROQ_API_KEY privately in the Render web service and run the signed-in assistant test.

## Safe rollout sequence

1. Merge security code only after CI and review pass.
2. Deploy to a non-production service and verify headers, readiness, auth, and app behavior.
3. Reconcile the migration history and prepare a reviewed, reversible database change.
4. Apply approved database changes during a controlled window after a verified backup.
5. Re-run security advisors and tenant-isolation tests.
6. Perform live end-to-end acceptance and document evidence before company-wide rollout.
