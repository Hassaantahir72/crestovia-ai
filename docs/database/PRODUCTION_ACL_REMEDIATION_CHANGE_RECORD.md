# Production ACL Remediation Change Record

**Status:** Prepared for review only — not approved or applied  
**Target:** Supabase production project `nnzxslnkpjlfbjmrvxaw`  
**Staging reference:** `xpwrsxmwqptrpwycibub`  
**Related staging migrations:** `0034_revoke_anon_public_privileges`, `0035_task_reminder_batch_dedupe_v0_2_94`, `0036_revoke_anon_public_schema_usage`

## 1. Current production baseline

Read-only inventory captured 2026-10-23:

- 21 public base tables; all 21 have RLS enabled.
- 11 tables have effective privileges for role `anon`: `departments`, `memberships`, `organization_invitations`, `organizations`, `owner_private_items`, `profiles`, `project_memberships`, `projects`, `task_comments`, `tasks`, and `workspace_activity`.
- 15 tables grant `authenticated` elevated table privileges (`TRUNCATE`, `REFERENCES`, `TRIGGER`, or `MAINTAIN`): `action_approval_requests`, `assistant_conversations`, `assistant_memories`, `assistant_messages`, `departments`, `memberships`, `organization_invitations`, `organizations`, `owner_private_items`, `profiles`, `project_memberships`, `projects`, `task_comments`, `tasks`, and `workspace_activity`.
- `anon` has `USAGE` on schema `public`.
- Supabase Security Advisor reports leaked-password protection disabled. This is a separate Auth setting and is out of scope for this ACL change.
- Staging's corresponding checks returned zero findings after migrations 0034–0036. This is useful evidence, not proof of production application compatibility.

## 2. Proposed scope

Subject to owner approval and staging acceptance, prepare a reviewed production migration that brings the exposed-schema ACL boundary in line with the staged design:

1. Revoke all table, sequence, and function privileges from `anon` for existing objects in `public`.
2. Revoke `TRUNCATE`, `REFERENCES`, `TRIGGER`, and (where supported by the target PostgreSQL version) `MAINTAIN` from `authenticated` on existing public tables.
3. Revoke `USAGE` on schema `public` from `anon` and `PUBLIC`, while explicitly retaining `USAGE` for `authenticated` and `service_role`.
4. Review default privileges for future objects created by `postgres`. Migration 0034 changes defaults globally for objects created by that role, not just in `public`; assess all schemas and every RPC before adopting those statements.
5. Treat platform-managed `supabase_admin` default ACLs as a separate limitation. The project `postgres` role cannot rewrite those defaults in the observed environment. Do not claim the gap is fixed for future objects created by that role.
6. Explicitly grant only the required RPC execution rights in each function migration. Do not depend on PostgreSQL's default `PUBLIC EXECUTE` grant.

Do not copy migrations 0034–0036 to production blindly or apply them solely to align migration counts. Migration 0035's reminder RPC is a separate feature change and should not be bundled into an ACL-only rollout without its own runtime acceptance.

## 3. Pre-change requirements (all must pass)

- [ ] Owner explicitly approves a production ACL change window.
- [ ] Confirm a recent production backup exists and complete a restore drill into an isolated target.
- [ ] Capture the exact current ACLs for tables, sequences, functions, schemas, and default privileges; store the output in the approved change record.
- [ ] Review the complete SQL against the live production PostgreSQL version and privileges; verify that every statement is supported.
- [ ] Diff the production and staging catalogs and enumerate all application RPCs, triggers, scheduled jobs, and server-side service-role operations.
- [ ] Run staging tests for sign-in, onboarding, invitations, organization membership, task/project CRUD, comments, approvals, assistant conversations/memories, email/webhook processing, and scheduled jobs.
- [ ] Run cross-organization and role-boundary acceptance with at least two distinct test organizations and the owner/admin/member roles. Do not use production user records as test fixtures.
- [ ] Verify service-role-only operations still work and that normal signed-in operations retain their required access.
- [ ] Prepare a tested rollback script from the captured ACL snapshot. A blanket re-grant is not an acceptable rollback.
- [ ] Schedule a controlled window with monitoring and an owner-approved stop/rollback decision point.

## 4. Verification immediately after rollout

Run the read-only audit at `database/audits/staging_security_audit.sql` against production only after the migration is explicitly approved and applied. Before that point, keep it on staging. The expected ACL results after an approved rollout are:

- All 21 public base tables still have RLS enabled.
- Zero public base tables have effective table privileges for `anon`.
- Zero public base tables grant `authenticated` the listed elevated administrative privileges.
- `anon` has no `USAGE` on schema `public`.
- No public function is executable by `anon`.
- Required `authenticated` and `service_role` schema access remains intact.
- Every intentionally callable RPC has explicit, documented grants.
- All application acceptance tests and the post-change error/log review pass.

Any unexpected permission error, onboarding/invitation regression, failed scheduled job, or tenant-boundary test failure is a stop condition. Follow the approved rollback procedure and document the result.

## 5. Rollback and audit trail

Rollback must restore the exact captured ACL/default-ACL state, not recreate broad grants from assumptions. After rollback, rerun the read-only ACL inventory and core application smoke tests. Record the migration checksum, operator, approver, UTC timestamps, verification output, test run links, and any deviations in the change ticket.

## 6. Explicit exclusions

This record does not authorize production SQL execution, production migration application, Supabase Auth setting changes, deployment, repository visibility changes, or PR merge. The leaked-password protection warning must be handled as a separate owner-approved Auth configuration change.
