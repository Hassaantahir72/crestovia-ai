# Security rollout and live-acceptance runbook

Date: 2026-10-23  
Scope: Crestovia AI security branch `security/company-hardening-v1`. This runbook is operational guidance, not authorization to mutate production.

## Current verified baseline

- Staging Supabase project `xpwrsxmwqptrpwycibub`: 36 migrations recorded; 21 public base tables; zero public base tables without RLS; security advisor currently has no findings.
- Production Supabase project `nnzxslnkpjlfbjmrvxaw`: 33 migrations recorded at the last migration inventory; 21 public base tables; zero public base tables without RLS. Security advisor still reports leaked-password protection disabled.
- Staging migrations 0034–0036 are not applied to production. Do not migrate production merely to equalize migration counts.
- User reports adding `GROQ_API_KEY` in Render. The value must never be copied into chat, source control, logs, or diagnostics. Configuration presence and successful provider connectivity are different claims; a signed-in owner must run the in-app connection test after the deployed code is verified.
- Render web and API currently track `chore/render-build-gates-api-service-v034`; the security branch is not deployed.
- Production database changes, Supabase Auth setting changes, repository visibility changes, PR merge, and public release remain owner-gated.

## 1. Before any production database change

1. Confirm the latest restorable backup/PITR point and retention in Supabase. Record who verified it and when.
2. Restore a backup into a non-production target and record successful authentication, core CRUD, organization isolation, and email/reminder behavior.
3. Review migrations 0034–0036 and enumerate all application tables, sequences, RPCs, service-role calls, scheduled jobs, and future migration grant assumptions.
4. Export a read-only privilege baseline from production and staging; preserve it with the change record.
5. Apply candidate SQL to staging first, run the acceptance checks below, and record exact results.
6. Prepare rollback steps. Privilege grants can be restored from the captured baseline; schema migrations may need a forward corrective migration rather than a destructive down migration.
7. Schedule a controlled window and obtain explicit owner approval before any production SQL. Do not run this runbook as a production migration automatically.

## 2. Read-only privilege inventory SQL

Run separately against staging and production before rollout. Save results without exposing secrets or row data.

```sql
select
  n.nspname as schema_name,
  c.relname as object_name,
  c.relkind as object_kind,
  r.rolname as grantee,
  x.privilege_type
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join lateral aclexplode(coalesce(c.relacl, acldefault(
  case when c.relkind in ('r','p','v','m','f') then 'r'::"char"
       when c.relkind = 'S' then 'S'::"char"
       else 'f'::"char" end, c.relowner
))) x
join pg_roles r on r.oid = x.grantee
where n.nspname = 'public'
  and r.rolname in ('anon', 'authenticated', 'service_role', 'PUBLIC')
order by n.nspname, c.relname, r.rolname, x.privilege_type;
```

Check schema access and function execution separately:

```sql
select
  n.nspname,
  r.rolname,
  has_schema_privilege(r.rolname, n.oid, 'USAGE') as can_use_schema,
  has_schema_privilege(r.rolname, n.oid, 'CREATE') as can_create
from pg_namespace n
cross join pg_roles r
where n.nspname = 'public'
  and r.rolname in ('anon', 'authenticated', 'service_role', 'PUBLIC')
order by r.rolname;

select
  p.oid::regprocedure as function_signature,
  r.rolname as role_name,
  has_function_privilege(r.rolname, p.oid, 'EXECUTE') as can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join pg_roles r
where n.nspname = 'public'
  and r.rolname in ('anon', 'authenticated', 'service_role', 'PUBLIC')
order by p.oid::regprocedure::text, r.rolname;
```

Note: `PUBLIC` is a pseudo-grantee and may not resolve as a normal role name in every helper function; if the query errors, inspect ACL entries with `aclexplode` and map grantee OID 0 to `PUBLIC`. Do not treat a failed inventory query as a clean result.

## 3. Staging reminder acceptance

Use only synthetic records in staging. Never seed test tasks or notifications into production.

1. Create two test organizations and one task in each; include one overdue and one due-soon task assigned to a member.
2. Invoke the reminder job through its normal authenticated server/cron path, not by granting browser access to the RPC.
3. Verify expected notification rows have matching organization, recipient, type, task entity, and day-specific dedupe key.
4. Re-run the job with the same day; duplicate notification count must not increase.
5. Add more than one batch of eligible synthetic tasks; verify repeated runs progress through candidates without exceeding the batch bound and without duplicate keys.
6. Verify done/cancelled tasks are skipped, unassigned tasks are skipped, and task reminders do not cross organizations.
7. Verify anon and authenticated cannot execute `public.enqueue_due_task_reminders(timestamptz,timestamptz,date,integer)`, while the trusted service role can.
8. Remove synthetic records after retaining test evidence, or reset the disposable staging fixture.

The staging task and notification tables were empty during the initial catalog audit, so catalog compatibility alone is not runtime acceptance.

## 4. Groq provider acceptance

1. In Render, confirm `GROQ_API_KEY` is set on the service that actually executes the server-side assistant route. Keep the value private.
2. Verify the live web service is running the commit containing the owner-only provider connection test. The security branch is not currently deployed, so do not assume its code is live.
3. Sign in as an authorized owner and run the app's AI connection test.
4. Confirm a small real request succeeds and the UI reports success without revealing the key or provider response internals.
5. Test missing/invalid key, timeout, rate limit, and provider error paths using a safe test environment; confirm no key or authorization header is logged.
6. If the test fails, inspect sanitized Render application logs and service environment configuration. Do not paste keys into chat.

## 5. Cross-organization authorization acceptance

Create two synthetic organizations with an owner, manager/admin, and member in each. Include a user who belongs to both organizations.

- Attempt read/create/update/delete/export operations against the other organization's IDs using direct requests, not only UI navigation.
- Repeat for projects, tasks, departments, conversations/memory, notifications, approvals, audit events, invitations, and memberships.
- Verify revoked/suspended members lose access promptly.
- Verify approval execution checks the approval's organization and current membership atomically.
- Verify direct browser clients cannot access server-only email MFA challenge data or execute privileged RPCs.
- Record expected status codes and sanitized evidence; no real customer data should be used.

## 6. Auth, email, cron, recovery, and release gates

- Enable leaked-password protection in Supabase Auth using the project dashboard, then re-run the production security advisor. This setting is not changed by a SQL migration.
- Confirm Resend key and webhook signing secret are privately configured. Send one controlled test email; verify delivery record, signed webhook acceptance, duplicate-event idempotency, and rejection of invalid signatures.
- Confirm the cron secret is long, random, privately configured, and rotated if it has ever been exposed. Verify no-secret and wrong-secret calls are rejected; verify an authorized invocation works.
- Confirm MFA enrollment/recovery, session revocation, invitation expiry, and role changes with real test accounts.
- Complete a backup restore drill into a non-production target and document the rollback plan and alerting.
- Test browser microphone permission, English and Urdu speech paths, audio cleanup, and graceful unsupported-browser behavior.
- Review CSP and third-party provider compatibility before enabling a restrictive CSP.
- Decide whether the GitHub repository should be private; changing visibility is an owner decision.
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
