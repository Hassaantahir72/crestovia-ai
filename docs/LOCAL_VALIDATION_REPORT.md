# Crestovia AI v0.3.4 — Local validation report

Validation date: 2026-10-22 (PKT)

## Passed

| Check | Result | Scope |
|---|---:|---|
| Node offline tests | 39 passed, 0 failed | `node --test scripts/*.test.mjs` |
| API tests | 107 passed, 0 failed | `python -m pytest apps/api/tests -q` |
| Migration sequence | Passed | 36 source files, 0001–0036; source order only |
| Readiness structure | Passed | Six gates / 30 checklist items; this does not mean release-ready |
| Python compile | Passed | API and migration-check source compile |

## Blocked / not verified

- Frontend dependency installation timed out against npm registry; offline npm install failed because package metadata was not cached.
- No `package-lock.json` is included, so frontend dependency resolution is not reproducible yet.
- ESLint, successful frontend TypeScript check, and Next.js production build have not been run successfully.
- GitHub Actions web/API jobs fail before any steps and job logs are unavailable; root cause is unconfirmed.
- Live Groq test not run. The previously pasted key is considered compromised and must be revoked; no replacement key was supplied through a private configuration channel.
- Real tenant-isolation acceptance not run because separate synthetic staging user tokens are not available in this environment. Mocked runner tests pass, but they do not prove live RLS behavior.
- No email delivery, real invitation acceptance, backup/restore drill, or full production smoke test was performed.
- No production database changes and no deployment.

## Code changes in this refresh

- Initialize rate-limit guard flags defensively in workspace, assistant, and email-approval actions.
- Explicitly narrow the validated email payload before using it for an approved send.

## Release decision

**Not ready to deploy.** Required blockers are a working frontend dependency/build pipeline, green CI on the exact candidate, private provider configuration and smoke tests, real two-tenant acceptance, and completion of the owner-approved production-readiness gate.
