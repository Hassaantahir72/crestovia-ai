## Crestovia AI — Current Build Status (2026-10-22)

**Project version:** 0.2.85
**Baseline commit:** 1b2d0a949dd80d651d338fcbb895b3804e701030 (v0.2.84 merged)
**Milestone:** Automated tests for production-readiness evidence reporting
**Overall product implementation estimate:** approximately 70% (rough engineering estimate; not a production-readiness score).
**Deployment:** deferred until owner approval.

### Current verification
- v0.2.84 was merged after API tests and web lint/production-build checks passed on its pull-request head.
- The v0.2.83 complete source archive was verified: ZIP integrity passed, 207 entries, web package version 0.2.83, and the read-only database audit SQL is present.
- This milestone adds regression tests for the readiness report's six-gate/30-item structure, machine-readable totals, and strict-mode exit behavior.
- No live database query, migration, grant change, or deployment was performed.

### Current release blockers
1. Review effective database grants and migration 0034 against required API/RPC behavior before approval. Migration 0034 remains unapplied; source changes alone do not resolve live privilege risk.
2. Validate organization isolation with separate organizations and real owner/admin/member/suspended test accounts, including direct API access.
3. Verify Groq, Resend delivery/webhooks, cron scheduling/alerts, and failure recovery with privately configured credentials.
4. Confirm backup retention and complete an isolated non-production restore drill.
5. Collect evidence for the production-readiness checklist; public deployment remains owner-gated.

