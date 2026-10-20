# Audit-log access regression checks

The audit log is a sensitive workspace record. These checks protect the source migrations from accidental edits that could broaden browser access.

## Expected rules

- Only authenticated users with an **active owner or admin membership** can select audit events for their own organization.
- Anonymous users have no table privileges.
- Authenticated browser users have SELECT only; they cannot insert, update, or delete audit records directly.
- Trusted server-side audit writes use the server-only Supabase service-role client. The service-role key must never be exposed to the browser.

## Automated checks

The API CI workflow runs apps/api/tests/test_security_migrations.py with the rest of the pytest suite. Despite living beside the API tests for convenient CI execution, these tests inspect SQL migration invariants; they do not connect to the database and do not prove real-user RLS behavior.

## Live verification still required

The connected Supabase project was checked after migrations 0014 and 0015. Real-account acceptance testing must still confirm that owners/admins can see their own organization's events, members cannot see audit history, and cross-organization records remain inaccessible. Never use a service-role client for ordinary user-facing reads.
