# Organization isolation acceptance checklist

Crestovia AI relies on Supabase row-level security as the database authorization boundary. Explicit organization and user predicates in application queries are defense in depth; source-level checks are not proof of live RLS isolation.

## Automated regression guardrails

The API CI suite checks that:
- Read-only assistant workspace queries include the active organization ID, keep assigned-task reads scoped to the signed-in user, remain read-only, and retain result bounds.
- Notification read-state mutations bind both the recipient and active organization.
- Approved task execution passes the active organization to the atomic database RPC instead of inserting a task directly from application code.

## Required live acceptance test

Use two separate organizations and at least three accounts (owner, ordinary member, and suspended/inactive member). Do not use production customer data.

1. Create distinct projects, tasks, approval requests, notifications, and assistant conversations in organization A and B.
2. Sign in as each role in organization A; confirm no list, detail, search, assistant context, notification, or mutation exposes organization B records.
3. Repeat in organization B, including an owner who belongs to both organizations if supported.
4. Attempt cross-organization IDs directly against read and mutation endpoints; expect denial or an empty result without revealing whether the foreign record exists.
5. Confirm suspended memberships cannot use workspace routes or mutate records after suspension.
6. Confirm approval execution fails for a request belonging to another organization, an expired request, a non-owner, and a request that has already executed.
7. Confirm notification read actions cannot mark another user's notification as read.
8. Capture outcomes and relevant request IDs without storing secrets or private content.

## Release gate

Do not treat this checklist or static pytest assertions as live acceptance. Record test accounts, environment, expected result, observed result, and date in a private report. Public deployment remains deferred until the owner approves it.
