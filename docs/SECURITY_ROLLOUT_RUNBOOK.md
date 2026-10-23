# Security rollout and live-acceptance runbook

Date: 2026-10-23  
Scope: Crestovia AI branch `security/company-hardening-v1`. This is operational guidance, not authorization to mutate production.

## Verified baseline

- Staging project `xpwrsxmwqptrpwycibub`: 36 migrations recorded; 21 public base tables; zero tables without RLS; no current security-advisor findings.
- Production project `nnzxslnkpjlfbjmrvxaw`: 33 migrations recorded; 21 public base tables; zero tables without RLS. The security advisor reports leaked-password protection disabled.
- Staging migrations 0034–0036 are not applied to production. Do not migrate production merely to equalize migration counts.
- The owner reports adding `GROQ_API_KEY` in Render. The secret must never be copied into chat, source control, logs, or diagnostics. Configuration presence is not proof of successful provider connectivity.
- Render web and API currently track `chore/render-build-gates-api-service-v034`; the security branch is not deployed.
- Production database changes, Supabase Auth setting changes, repository visibility changes, PR merge, and public release remain owner-gated.

## 1. Before any production database change

1. Confirm the latest restorable backup/PITR point and retention in Supabase.
2. Restore a backup into a non-production target and record authentication, CRUD, organization isolation, and email/reminder behavior.
3. Review migrations 0034–0036 and enumerate application tables, sequences, RPCs, service-role calls, scheduled jobs, and future migration grant assumptions.
4. Export a read-only privilege baseline from production and staging; preserve it with the change record.
5. Apply candidate SQL to staging first and run the acceptance checks below.
6. Prepare rollback steps. Privilege grants can be restored from the captured baseline; schema migrations may need a forward corrective migration rather than a destructive down migration.
7. Obtain explicit owner approval before any production SQL. Do not run this runbook as a production migration automatically.

## 2. Read-only privilege inventory SQL

Run separately against staging and production. These queries inspect grants only; they do not mutate data or schema.

### Table, view, sequence, and other relation ACLs

```sql
select
  n.nspname as schema_name,
  c.relname as object_name,
  c.relkind as object_kind,
  case when x.grantee = 0 then 'PUBLIC' else r.rolname end as grantee,
  x.privilege_type
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join lateral aclexplode(coalesce(c.relacl, acldefault(
  case when c.relkind in ('r','p','v','m','f') then 'r'::"char"
       when c.relkind = 'S' then 'S'::"char"
       else 'f'::"char" end, c.relowner
))) x
left join pg_roles r on r.oid = x.grantee
where n.nspname = 'public'
  and (x.grantee = 0 or r.rolname in ('anon', 'authenticated', 'service_role'))
order by n.nspname, c.relname, grantee, x.privilege_type;
```

### Schema ACLs (including PUBLIC)

```sql
select
  n.nspname as schema_name,
  case when x.grantee = 0 then 'PUBLIC' else r.rolname end as grantee,
  x.privilege_type
from pg_namespace n
cross join lateral aclexplode(coalesce(n.nspacl, acldefault('n'::"char", n.nspowner))) x
left join pg_roles r on r.oid = x.grantee
where n.nspname = 'public'
  and (x.grantee = 0 or r.rolname in ('anon', 'authenticated', 'service_role'))
order by grantee, x.privilege_type;
```

### Function execute ACLs (including PUBLIC)

```sql
select
  p.oid::regprocedure as function_signature,
  case when x.grantee = 0 then 'PUBLIC' else r.rolname end as grantee,
  x.privilege_type
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral aclexplode(coalesce(p.proacl, acldefault('f'::"char", p.proowner))) x
left join pg_roles r on r.oid = x.grantee
where n.nspname = 'public'
  and (x.grantee = 0 or r.rolname in ('anon', 'authenticated', 'service_role'))
order by p.oid::regprocedure::text, grantee;
```

Review global and schema-specific default ACLs separately using `pg_default_acl`; remember that global and schema-specific ACLs are additive. Hosted Supabase platform-managed `supabase_admin` defaults may not be alterable by the project's `postgres` role.

## 3. Staging reminder acceptance

Use synthetic records in staging only. Never seed production for testing.

1. Create two test organizations and tasks that cover overdue, due-soon, done/cancelled, and unassigned cases.
2. Invoke the reminder job through its normal authenticated server/cron path, not by granting browser access to the RPC.
3. Verify organization, recipient, type, task entity, and day-specific dedupe key for inserted notifications.
4. Re-run for the same day; duplicate notification count must not increase.
5. Add more than one batch of eligible tasks; verify repeated runs progress through candidates without exceeding the 500-row bound or duplicating keys.
6. Verify tasks do not cross organizations and done/cancelled/unassigned tasks are skipped.
7. Verify anon and authenticated cannot execute `public.enqueue_due_task_reminders(timestamptz,timestamptz,date,integer)`, while trusted service_role can.
8. Retain sanitized evidence and clean up synthetic records or reset the disposable fixture.

Staging tasks and notifications were empty during the initial catalog audit, so catalog compatibility alone is not runtime acceptance.

## 4. Groq provider acceptance

1. In Render, confirm `GROQ_API_KEY` is set on the service that actually executes the server-side assistant route. Keep its value private.
2. Verify the live service is running code that includes the owner-only provider connection test. The security branch is not currently deployed.
3. Sign in as an authorized owner and run the in-app AI connection test.
4. Confirm a small real request succeeds without exposing the key or provider response internals.
5. In a safe test environment, exercise missing/invalid key, timeout, rate-limit, and provider-error paths; confirm no key or authorization header is logged.
6. If the test fails, inspect sanitized logs and environment configuration. Never paste secrets into chat.

## 5. Cross-organization authorization acceptance

Create two synthetic organizations with an owner, manager/admin, and member in each, including a user who belongs to both organizations.

- Attempt read/create/update/delete/export operations against the other organization's IDs using direct requests, not only UI navigation.
- Repeat for projects, tasks, departments, conversations/memory, notifications, approvals, audit events, invitations, and memberships.
- Verify revoked/suspended memberships lose access promptly.
- Verify approval execution checks the approval's organization and current membership atomically.
- Verify browser clients cannot access server-only email MFA challenge data or execute privileged RPCs.
- Record expected status codes and sanitized evidence; use no real customer data.

## 6. Auth, email, cron, recovery, and release gates

- Enable leaked-password protection in production Supabase Auth using the dashboard, then re-run the security advisor. This is an Auth setting, not a SQL migration.
- Confirm Resend credentials and webhook signing secret are configured privately. Send one controlled test email; verify delivery recording, signed webhook acceptance, duplicate-event idempotency, and rejection of invalid signatures.
- Confirm the cron secret is strong and private. Verify missing/wrong-secret calls are rejected and an authorized invocation works.
- Test MFA enrollment/recovery, session revocation, invitation expiry, and role changes with real test accounts.
- Complete a backup restore drill into a non-production target and document rollback and alerting.
- Test browser microphone permission, English and Urdu speech paths, audio cleanup, and unsupported-browser behavior.
- Review CSP and third-party provider compatibility before enabling a restrictive CSP.
- Decide whether the GitHub repository should be private; visibility is an owner decision.
- Merge/deploy the security branch and release publicly only after review and explicit owner authorization.

## 7. Change record template

- Environment:
- Candidate commit:
- Backup/PITR point and restore evidence:
- SQL reviewed by:
- Staging runtime tests and evidence:
- Rollback plan:
- Change window:
- Owner approval:
- Post-change privilege diff:
- Post-change advisor output:
- Post-change health and user acceptance:
