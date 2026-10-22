# Migration 0034 — RPC compatibility review

**Scope:** source-level review only. This document does not prove the live database matches repository migrations and does not authorize applying migration `0034_revoke_anon_public_privileges.sql`.

## RPC inventory from current application call sites

| RPC | Call path | Intended role | Source grant evidence |
|---|---|---|---|
| `create_organization(text, text)` | Browser onboarding via the authenticated Supabase client | `authenticated` | Migration `0006_safe_organization_bootstrap.sql` revokes EXECUTE from PUBLIC and grants it to authenticated. |
| `execute_approved_task_request(uuid, uuid)` | Authenticated dashboard action; organization ID is passed to the RPC | `authenticated` | Migration `0023_approval_execution_org_scope_v0_2_41.sql` explicitly grants EXECUTE to authenticated. |
| `consume_user_rate_limit(uuid, text, integer, integer)` | Server-side rate limiter through the admin client | `service_role` only | Migration `0032_user_rate_limits_v0_2_52.sql` revokes PUBLIC/anon/authenticated and grants service_role. |
| `issue_email_mfa_challenge(...)` | Email-MFA request route through the admin client | `service_role` only | Migration `0016_atomic_email_mfa_challenge_issuance.sql` revokes PUBLIC/anon/authenticated and grants service_role. |
| `record_email_mfa_failed_attempt(uuid)` | Email-MFA verification route through the admin client | `service_role` only | Migration `0017_atomic_email_mfa_failed_attempts.sql` revokes PUBLIC/anon/authenticated and grants service_role. |
| `apply_resend_delivery_event(text, text, text, text)` | Resend webhook route through the admin client | `service_role` only | Migration `0030_resend_delivery_webhooks_v0_2_47.sql` revokes PUBLIC/anon/authenticated and grants service_role. |

## What migration 0034 does and does not do

- Revokes all existing table, sequence, and function privileges from `anon` in the public schema.
- Removes existing table-level administrative privileges (TRUNCATE, REFERENCES, TRIGGER, MAINTAIN) from `authenticated`, while retaining its normal row-level operations subject to RLS.
- Changes default privileges for future objects created by `postgres` and `supabase_admin`; future RPCs must receive explicit grants.
- It does **not** contain a blanket revoke of EXECUTE on all existing functions from `authenticated`. That distinction matters because onboarding and approved-task execution are authenticated-client RPCs.

## Required live acceptance before applying

1. Run `database/operations/live-db-security-audit.sql` against the intended environment using an authorized, read-only session; retain the output securely. Its default-ACL inventory includes both global ACLs (defaclnamespace = 0) and public-schema-specific ACLs because global defaults also affect objects created in public.
2. Compare live function signatures and effective EXECUTE privileges to this source inventory and all additional RPCs in the live audit.
3. Confirm the live `supabase_migrations.schema_migrations` history and determine why migration 0034 is pending before scheduling it.
4. Review each existing anon grant and authenticated administrative grant against real API/UI paths; verify any required grants are explicitly present.
5. Apply only to a non-production environment first, run organization isolation and auth/RPC acceptance tests, and compare the post-migration audit.
6. Obtain explicit owner approval before any live migration. No production apply is authorized by this document.

**Current conclusion:** the source changes appear designed to preserve the two known authenticated RPCs while making future function grants opt-in, but this is not a substitute for live privilege output, full RPC inventory, and non-production acceptance testing.
