# Live database security audit — 2026-10-21

## Scope and safety

A read-only inspection was performed against the connected Crestovia AI Supabase project on 2026-10-21. No database writes, migration applications, grant changes, policy changes, test-user creation, or production deployment were performed.

## Observed results

- Project status reported as active/healthy; PostgreSQL 17.11.
- **21 public base tables** were listed. All 21 had Row Level Security enabled and each had at least one RLS policy.
- Supabase Security Advisor returned **zero findings** at the time of inspection; the SQL privilege audit nevertheless found grants that warrant hardening.
- The migration history contained 33 entries. The recorded history includes the name `private_assistant_conversations_and_memory` twice; the source tree contains that migration once and separately contains `0008_invitees_can_view_pending_organizations.sql`.
- The source tree contains `0018_foreign_key_lookup_indexes.sql`; its exact source filename is not represented as a migration name in the recorded history. Several later entries are recorded with a prefixed source number or release suffix. A read-only index check confirmed representative indexes from the foreign-key index set exist in the database, so **do not assume that the migration itself is absent or re-run it blindly**.
- The unauthenticated `anon` role had direct table privileges, including effective `TRUNCATE` on 11 public tables. The `authenticated` role had effective `TRUNCATE` and PostgreSQL 17 `MAINTAIN` privileges on 15 public tables. RLS does not constrain table-level `TRUNCATE`/`MAINTAIN`; table grants must be minimized separately.
- Default ACLs for both `postgres` and `supabase_admin` included broad public-schema table grants to `anon`, `authenticated`, and `service_role`, plus function and sequence defaults. These defaults can reintroduce excess privileges on future objects.
- The first function audit filtered to `SECURITY DEFINER` routines only, which was too narrow for an RPC permission review. The v0.2.79 source audit now lists all public functions, effective `anon`/`authenticated`/`PUBLIC` EXECUTE access, and whether each routine is `SECURITY DEFINER`. The v0.2.80 audit also checks effective table row/admin privileges and sequence privileges, including inherited `PUBLIC` grants. The v0.2.81 audit includes partitioned tables, reports `FORCE ROW LEVEL SECURITY` and permissive/restrictive policy counts, inventories policy commands/predicates, and checks effective schema `USAGE`/`CREATE` grants.
- The performance advisor reported 47 informational unused-index findings. The tables currently report zero rows, so these warnings are expected for an unexercised database and are not a basis for removing indexes.

## Required follow-up

1. Reconcile source migration files against the timestamped Supabase migration history using a reviewed mapping/checksum ledger. Do not edit migration history or replay DDL solely to make names match.
2. Review and approve the proposed `0034_revoke_anon_public_privileges.sql` hardening migration. It removes all `anon` table/sequence/function privileges and limits authenticated table privileges to normal row operations. It has **not** been applied to the live database; confirm application compatibility and apply only after explicit approval.
3. Re-run the updated read-only audit SQL before and after any approved migration. Compare direct grants with effective table privileges (including inherited `PUBLIC` grants), effective sequence privileges, function EXECUTE grants, and default ACLs. Review every function result; do not blanket-revoke an RPC that the app requires.
4. Run organization/role isolation acceptance tests using dedicated test users and separate test organizations in a non-production environment. Current zero-row tables mean this has not been demonstrated with real organization data.
5. Revisit unused-index findings only after representative test traffic or production workload exists.
6. Record the audit date and evidence owner when updating the production-readiness checklist.

## Re-run

Run `database/operations/live-db-security-audit.sql` in the Supabase SQL editor or another trusted read-only database session. All ten statements are SELECT-only. Statements 7–9 check effective table, sequence, and schema privileges, including inherited grants; statement 10 inventories policy commands and predicates. These queries do not alter permissions. Review results before changing any access policy or migration history.

**Status:** useful point-in-time evidence, not a production-readiness sign-off and not permission to deploy publicly.
