# Migration 0034 — RPC and default-ACL compatibility review

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
- Revokes relevant global default ACL grants for objects created by `postgres` and `supabase_admin`. **This global default-ACL cleanup affects future objects in every schema those roles own**, not only `public`, because global grants are additive and cannot be cancelled by a schema-specific REVOKE. Review this cross-schema scope against the target environment before applying.
- Retains public-schema-specific default revokes as an additional explicit guard.
- It does **not** contain a blanket revoke of EXECUTE on all existing functions from `authenticated`. That distinction matters because onboarding and approved-task execution are authenticated-client RPCs.
- Source changes do not alter the connected live database and do not establish that the live grants/default ACLs match this file.

## Required live acceptance before applying

1. Run `database/operations/live-db-security-audit.sql` against the intended environment using an authorized, read-only session; retain the output securely. Its default-ACL inventory includes both global ACLs (`defaclnamespace = 0`) and public-schema-specific ACLs.
2. Compare global and schema-specific ACLs for `postgres` and `supabase_admin`; confirm whether any non-public schema depends on the default grants being removed.
3. Compare live function signatures and effective EXECUTE privileges to this source inventory and all additional RPCs in the live audit.
4. Confirm the live `supabase_migrations.schema_migrations` history and determine why migration 0034 is pending before scheduling it.
5. Review each existing anon grant and authenticated administrative grant against real API/UI paths; verify any required grants are explicitly present.
6. Apply only to a non-production environment after explicit approval for that test, run organization isolation and auth/RPC acceptance tests, and compare the post-migration audit.
7. Obtain explicit owner approval before any live migration. No production apply is authorized by this document.

**Current conclusion:** global default ACL handling is now explicit in source and regression-tested, but the cross-schema impact, live grant inventory, full RPC compatibility, and non-production acceptance still require review.
