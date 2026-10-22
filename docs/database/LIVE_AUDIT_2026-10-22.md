# Live Supabase privilege audit — 2026-10-22

**Scope:** read-only inspection of project `crestovia-ai` on 2026-10-22. No grants, data, migration history, or schema were changed. This snapshot is evidence of current effective privileges, not an authorization to apply migration 0034.

## Migration history

The latest recorded migration is `0033_retry_unmatched_resend_events_v0_2_56`. Migration 0034 is not applied; its source filename is `0034_revoke_anon_public_privileges.sql`.

## Effective table privileges

The read-only `has_table_privilege` audit returned the following effective privileges for `anon` on 11 public tables:

- `departments`
- `memberships`
- `organization_invitations`
- `organizations`
- `owner_private_items`
- `profiles`
- `project_memberships`
- `projects`
- `task_comments`
- `tasks`
- `workspace_activity`

For each listed table, effective SELECT, INSERT, UPDATE, DELETE, and TRUNCATE were `true`. Row-level security may constrain ordinary row operations, but RLS does not filter TRUNCATE.

The same audit returned effective `authenticated` TRUNCATE and MAINTAIN privileges on 15 public tables:

- `action_approval_requests`
- `assistant_conversations`
- `assistant_memories`
- `assistant_messages`
- `departments`
- `memberships`
- `organization_invitations`
- `organizations`
- `owner_private_items`
- `profiles`
- `project_memberships`
- `projects`
- `task_comments`
- `tasks`
- `workspace_activity`

These administrative privileges are not filtered by row-level security and remain a release blocker.

## Effective RPC EXECUTE privileges

The six inventoried public RPCs currently show the expected effective EXECUTE permissions:

| RPC | `anon` | `authenticated` | `PUBLIC` |
|---|---:|---:|---:|
| `create_organization(text, text)` | false | true | false |
| `execute_approved_task_request(uuid, uuid)` | false | true | false |
| `consume_user_rate_limit(uuid, text, integer, integer)` | false | false | false |
| `issue_email_mfa_challenge(...)` | false | false | false |
| `record_email_mfa_failed_attempt(uuid)` | false | false | false |
| `apply_resend_delivery_event(text, text, text, text)` | false | false | false |

All six routines were reported as SECURITY INVOKER. This inventory is limited to the six source-reviewed RPCs and does not replace a complete function-by-function live review.

## Default privileges

The live `pg_default_acl` output showed broad default grants to `anon` and `authenticated` for tables, sequences, and functions created by both `postgres` and `supabase_admin`. Migration 0034 is intended to change these defaults but has not been applied.

## Required next steps

1. Review migration 0034 and the complete live RPC/function inventory against all API/UI call paths.
2. Apply to a non-production environment only after explicit owner approval for that test, then run direct API, auth, onboarding, approval, webhook, and tenant-isolation acceptance tests.
3. Compare post-migration effective privileges and default ACLs to this baseline.
4. Do not apply the migration to production until the compatibility review and non-production acceptance succeed and the owner explicitly approves the live change.

**Current status:** critical blocker remains open. No live grants, migration history, data, or deployment were changed.