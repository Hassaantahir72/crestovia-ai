# Crestovia AI — Staging Acceptance Record (2026-10-22)

## Environment identity

- Project: `crestovia-ai-staging`
- Project reference: `xpwrsxmwqptrpwycibub`
- Region: `ap-southeast-2` (Sydney)
- Status: `ACTIVE_HEALTHY`
- Production reference: `nnzxslnkpjlfbjmrvxaw` (`crestovia-ai`, Singapore)
- The staging project is a separate Supabase project. No production schema or data changes were made during this setup.

## Database migrations

Migrations `0001` through `0035` have been applied to staging in sequence. The database migration history confirms all 35 entries, including:

- `0034_revoke_anon_public_privileges`
- `0035_task_reminder_batch_dedupe_v0_2_94`

Staging began with an empty public schema and currently has no seeded company or user data.

## Verified database checks

| Check | Result |
| --- | --- |
| Public tables | 21 |
| Public tables with RLS enabled | 21 |
| Public tables without RLS | 0 |
| Public tables where `anon` retains table DML privileges | 0 |
| Public tables where `authenticated` retains TRUNCATE / MAINTAIN / REFERENCES / TRIGGER | 0 |
| Public functions executable by `anon` | 0 |
| Supabase security advisor findings | 0 |

### RPC grant checks

- `create_organization(text, text)`: authenticated and service role can execute; anon cannot.
- `execute_approved_task_request(uuid, uuid)`: authenticated and service role can execute; anon cannot.
- Server-only rate-limit, email-MFA, Resend event, and task-reminder RPCs: service role can execute; anon and authenticated cannot.

These are database privilege checks; they do not replace end-to-end sign-in and tenant-isolation tests with real test accounts.

## Known hosted-role limitation

The original migration `0034` attempted to change default privileges for `supabase_admin`. The connected hosted project runs the migration as `postgres`, which is not a member of `supabase_admin`; PostgreSQL rejects that statement with `permission denied to change default privileges` and rolls the migration back.

A compatibility revision now hardens existing public objects and default privileges for objects created by `postgres`, while explicitly documenting that it cannot change `supabase_admin` defaults. The live catalog still shows schema-specific defaults for `supabase_admin` in `public` that grant privileges to `anon`. Therefore:

- Existing staging tables/functions passed the checks above.
- Any future public object created as `supabase_admin` would need a separate privileged platform operation or a documented, verified alternative.
- Do not describe the default-ACL story as fully resolved, and do not promote this change to production until the remaining default-ACL behavior is resolved and accepted.

## Advisor notes

The security advisor returned no findings after the migration changes. The performance advisor reported 47 unused indexes; staging is fresh and has not run application workloads, so this is expected and is not a reason to drop indexes.

## Not yet verified

- Sign-in and session lifecycle using dedicated staging test users.
- Organization isolation using two separate test organizations and owner/admin/member/suspended roles.
- Real browser-to-API integration with staging environment variables.
- Groq AI provider, Resend email delivery/webhooks, and scheduled task reminders with privately configured credentials.
- Backup retention and a non-production restore drill.
- Full production-readiness evidence and deployment-owner approval.

## Safety

Do not seed real employee/customer data into staging. Keep staging credentials separate from production. No production migration or public deployment is authorized by this record.
