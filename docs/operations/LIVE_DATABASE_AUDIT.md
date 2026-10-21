# Live database security audit — 2026-10-21

## Scope and safety

A read-only inspection was performed against the connected Crestovia AI Supabase project on 2026-10-21. No database writes, migration applications, grant changes, policy changes, test-user creation, or production deployment were performed.

## Observed results

- Project status reported as active/healthy; PostgreSQL 17.11.
- **21 public base tables** were listed. All 21 had Row Level Security enabled and each had at least one RLS policy.
- Supabase Security Advisor returned **zero findings** at the time of inspection.
- The migration history contained 33 entries. The recorded history includes the name `private_assistant_conversations_and_memory` twice; the source tree contains that migration once and separately contains `0008_invitees_can_view_pending_organizations.sql`.
- The source tree contains `0018_foreign_key_lookup_indexes.sql`; its exact source filename is not represented as a migration name in the recorded history. Several later entries are recorded with a prefixed source number or release suffix. A read-only index check confirmed representative indexes from the foreign-key index set exist in the database, so **do not assume that the migration itself is absent or re-run it blindly**.
- The performance advisor reported 47 informational unused-index findings. The tables currently report zero rows, so these warnings are expected for an unexercised database and are not a basis for removing indexes.

## Required follow-up

1. Reconcile source migration files against the timestamped Supabase migration history using a reviewed mapping/checksum ledger. Do not edit migration history or replay DDL solely to make names match.
2. Review the results of the read-only audit SQL in `live-db-security-audit.sql`, especially direct browser-role grants and `SECURITY DEFINER` functions. Intentional RPC grants must be reviewed in context rather than revoked automatically.
3. Run organization/role isolation acceptance tests using dedicated test users and separate test organizations in a non-production environment. Current zero-row tables mean this has not been demonstrated with real organization data.
4. Revisit unused-index findings only after representative test traffic or production workload exists.
5. Record the audit date and evidence owner when updating the production-readiness checklist.

## Re-run

Run `database/operations/live-db-security-audit.sql` in the Supabase SQL editor or another trusted read-only database session. All statements are SELECT-only. Review results before changing any access policy or migration history.

**Status:** useful point-in-time evidence, not a production-readiness sign-off and not permission to deploy publicly.
