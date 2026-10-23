# Read-only staging database security audit

Run `database/audits/staging_security_audit.sql` using the Supabase SQL editor or an authorized read-only SQL session against **staging only**:

- Staging project ref: `xpwrsxmwqptrpwycibub`
- Do not run this as a migration; it is a read-only audit query.
- The query returns one row for each failed invariant. An empty result means the specific checks passed at the time of the query.

The audit checks:
- RLS is enabled on every public base table.
- The `anon` role has no effective table privileges on public base tables.
- `authenticated` has no effective TRUNCATE, REFERENCES, TRIGGER, or MAINTAIN privilege on public base tables.
- `anon` has no effective USAGE on the public schema.
- `anon` has no effective EXECUTE on public functions.
- `enqueue_due_task_reminders` exists as SECURITY INVOKER, is executable by `service_role`, and is not executable by browser roles.

It is intentionally read-only and does not inspect secret values or mutate database objects/data. It does not replace Supabase Security Advisor, live user/role acceptance, or a production backup/restore drill. Save the date, project ref, result, and reviewer in the release evidence record.
