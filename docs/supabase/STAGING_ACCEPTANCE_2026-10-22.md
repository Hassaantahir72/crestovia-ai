# Crestovia AI — Staging Acceptance Record (2026-10-22)

## Environment identity

- Project: `crestovia-ai-staging`
- Project reference: `xpwrsxmwqptrpwycibub`
- Region: `ap-southeast-2` (Sydney)
- Status: `ACTIVE_HEALTHY`
- Production reference: `nnzxslnkpjlfbjmrvxaw` (`crestovia-ai`, Singapore)
- The staging project is a separate Supabase project. No production schema or data changes were made during this setup.

## Database migrations

Migrations `0001` through `0036` have been applied to staging in sequence. The database migration history confirms all 36 entries, including:

- `0034_revoke_anon_public_privileges`
- `0035_task_reminder_batch_dedupe_v0_2_94`
- `0036_revoke_anon_public_schema_usage`

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
| `anon` has `USAGE` on schema `public` | No |
| `authenticated` has `USAGE` on schema `public` | Yes |
| `service_role` has `USAGE` on schema `public` | Yes |
| Supabase security advisor findings | 0 |

### RPC grant checks

- `create_organization(text, text)`: authenticated and service role can execute; anon cannot.
- `execute_approved_task_request(uuid, uuid)`: authenticated and service role can execute; anon cannot.
- Server-only rate-limit, email-MFA, Resend event, and task-reminder RPCs: service role can execute; anon and authenticated cannot.

These are database privilege checks; they do not replace end-to-end sign-in and tenant-isolation tests with real test accounts.

## Hosted-role default-ACL mitigation

The platform-managed `supabase_admin` role has schema-specific default ACLs in `public` that include `anon`. The connected `postgres` role is not a member of `supabase_admin`, so PostgreSQL rejects attempts to alter that role's defaults from this connection.

Migration `0036_revoke_anon_public_schema_usage` applies a verified schema-boundary mitigation:

- `anon` does not have effective `USAGE` on schema `public`.
- The `PUBLIC` role also no longer has `USAGE` on schema `public`.
- `authenticated` and `service_role` retain `USAGE`.
- All 21 existing public tables still have RLS enabled, and none have RLS disabled.
- The effective privilege audit reports zero anonymous table DML grants and the security advisor reports no findings.

The `supabase_admin` default ACL entries themselves remain in the catalog. A future object created under that role could still receive latent object-level grants to `anon`, but anonymous access to that object remains blocked by the schema boundary unless schema access is later re-granted. Re-run the schema and object privilege audit after future migrations or platform changes. Do not claim that the platform-managed default ACL entries themselves were changed.

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
