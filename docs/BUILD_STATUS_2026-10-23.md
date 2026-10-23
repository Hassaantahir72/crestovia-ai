# Crestovia AI build status — 2026-10-23

## Verified on the current candidate

- Candidate branch: `chore/render-build-gates-api-service-v034`.
- Latest previously confirmed web CI run: [39945432657](https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39945432657) — successful.
- Latest previously confirmed API CI run: [39945432589](https://github.com/Hassaantahir72/crestovia-ai/actions/runs/39945432589) — successful.
- Render test preview was confirmed live on commit `14060a6b19efb0cb4f4b6fc86ea51234196c7291`: https://crestovia-ai.onrender.com
- The local validation results recorded in `PRODUCTION_READINESS.md` are user-reported and must not be described as a fresh independent run by CI.
- No production database migrations or writes have been performed as part of this work.

## Release blockers still open

1. Verify that a real signed-in owner can create the first workspace and receives an active owner membership.
2. Expand tenant-isolation acceptance beyond read-only row visibility: mutations, server actions, roles, stale workspace context, suspended/revoked memberships, and approval replay.
3. Verify a real AI-provider request and safe handling of missing/invalid keys, timeouts, and rate limits.
4. Complete real email delivery and password recovery after the provider and auth redirect settings are configured.
5. Verify backup/PITR availability and complete a restore drill in non-production.
6. Generate and verify a source ZIP from the exact release candidate commit.
7. Obtain explicit owner approval before any public production launch.

## Safety and deployment policy

The Render URL is a test preview, not a production-readiness claim. Keep production launch gated. Do not apply production migrations, merge stacked PRs, upgrade to paid hosting, or expose secrets as part of automated work without explicit owner approval. The app repository has previously appeared public in GitHub API metadata; verify repository visibility and never commit credentials.

## Progress estimate

The prior working estimate was 60–70% complete, with 30–40% remaining to a verified first release. This is a planning estimate, not an automated measurement.