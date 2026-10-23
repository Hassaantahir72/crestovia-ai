# Production vs staging security comparison — 2026-10-23

**Read-only audit only. No database grants, schema, data, migrations, or deployment settings were changed by this audit.**

## Summary

| Check | Production project | Staging project |
|---|---:|---:|
| Recorded migrations | 33 | 36 |
| Public base tables with effective anon table privileges | 11 | 0 |
| Public base tables with effective authenticated TRUNCATE / REFERENCES / TRIGGER / MAINTAIN privileges | 15 | 0 |
| Public base tables without RLS enabled | 0 | 0 |
| Supabase security advisor | 1 warning | 0 findings |

Project IDs are intentionally omitted from this report; they are configured in the private deployment environment.

## Migration gap

Production records migrations through `0033_retry_unmatched_resend_events_v0_2_56`. Staging records three additional migrations:

- `0034_revoke_anon_public_privileges`
- `0035_task_reminder_batch_dedupe_v0_2_94`
- `0036_revoke_anon_public_schema_usage`

Do not apply migrations solely to make counts match. Migration 0034 includes global default-privilege changes for objects created by the postgres role; its scope and application compatibility require review. Migration 0035 adds a bounded reminder-queue RPC. Migration 0036 removes anonymous USAGE on the public schema and explicitly retains USAGE for authenticated and service-role users.

## Security findings

- Production: 11 public tables report one or more effective table privileges for role anon among SELECT, INSERT, UPDATE, DELETE, and TRUNCATE.
- Production: 15 public tables report one or more effective administrative privileges for role authenticated among TRUNCATE, REFERENCES, TRIGGER, and MAINTAIN.
- RLS is enabled on all public base tables counted by this check in both environments. RLS does not neutralize TRUNCATE or other table-level administrative privileges.
- Staging returned zero for both privilege categories and zero public base tables without RLS.
- Production Supabase security advisor reports leaked-password protection disabled. This setting must be enabled by an authorized project owner in Supabase Auth settings and then verified.

## Recommended controlled remediation

1. Confirm a recent, restorable production backup and identify the rollback plan.
2. Review the complete SQL and dependency effects of migrations 0034, 0035, and 0036.
3. Test the exact sequence on staging and run application smoke tests for onboarding, authenticated workspace operations, assistant, notifications, and scheduled reminders.
4. Schedule a controlled production window and obtain explicit owner approval before applying DDL/privilege changes.
5. Re-run this read-only query set, compare effective privileges with staging, and run Supabase security advisors.
6. Keep the launch gate closed until the live results and cross-organization negative tests are documented.

## Scope and limitations

This is a point-in-time read-only comparison, not a penetration test. It checks aggregate privilege counts and migration history; it does not independently prove every RLS policy, every function grant, storage policy, or browser/API authorization path is correct.


## Follow-up staging compatibility verification — 2026-10-23

A second read-only pass queried the live production and staging catalogs after the original summary. No DDL, grants, data, migrations, Auth settings, or deployment settings were changed.

| Check | Production | Staging after 0034–0036 |
|---|---:|---:|
| Public base tables | 21 | 21 |
| Public base tables without RLS | 0 | 0 |
| Tables with effective anon table privileges | 11 | 0 |
| Tables with authenticated TRUNCATE / REFERENCES / TRIGGER privileges | 15 | 0 |
| anon has USAGE on public schema | yes | no |
| authenticated has USAGE on public schema | yes | yes |
| service_role has USAGE on public schema | not part of this comparison | yes |

### Migration 0035 runtime compatibility

Catalog checks on staging confirmed that `public.enqueue_due_task_reminders(timestamptz, timestamptz, date, integer)` exists and is **SECURITY INVOKER** (not SECURITY DEFINER). Effective EXECUTE privileges are denied to `anon` and `authenticated`, and allowed to `service_role`, as intended by the migration and the cron route's server-side admin client.

The live staging schema has the columns used by the function:
- `tasks`: `id`, `organization_id`, `title`, `status`, `assigned_to`, `due_at`
- `notifications`: `organization_id`, `recipient_id`, `created_by`, `type`, `title`, `body`, `entity_type`, `entity_id`, `dedupe_key`

The notification table has a unique constraint on `dedupe_key`, accepts both `task_overdue` and `task_due_soon` notification types, and allows `entity_type = 'task'`. The task status check includes `done` and `cancelled`, which are excluded by the function. The task title limit is 200 characters and notification body limit is 1000, so copying a task title into the notification body remains within that database limit.

### Migration 0036 and hosted default ACLs

The staging catalog still shows platform-managed `supabase_admin` default ACL entries that include grants for `anon` on objects in `public`. The connected `postgres` role cannot safely rewrite those platform-owned defaults. The verified schema-level boundary from migration 0036 makes `has_schema_privilege('anon', 'public', 'USAGE')` false while keeping schema USAGE for `authenticated` and `service_role`. This is the intended hosted-Supabase mitigation; do not claim that the platform-owned default ACLs themselves were changed.

### Verification boundary

These checks establish structural and privilege compatibility, not end-to-end application behavior. Staging tables currently have zero rows in the management listing, so these queries do not prove reminder insertion against realistic task/membership data or cross-organization behavior. Before production rollout, still run staging application smoke tests with controlled test organizations/tasks, verify the cron endpoint with valid and invalid secrets, and confirm the scheduled job is configured. Production remains unchanged and the release gate remains closed.
