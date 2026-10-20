# Phase 2 — Company workspace setup

This increment introduces the database model and read-only project/task screens. It does not yet include project/task create-edit forms, invitations, realtime subscriptions, or a live connection to the user's Supabase project.

## Apply the migration

1. Confirm `database/migrations/0001_foundation.sql` has succeeded in the intended Supabase project.
2. Open Supabase Dashboard → SQL Editor → New query.
3. Copy all of `database/migrations/0002_company_workspace.sql` into the editor and run it once.
4. If Supabase reports an error, stop and share the error text without any credentials. Do not repeatedly rerun a partially applied migration until the error is understood.
5. Sign in to the web app and open `/dashboard/projects` and `/dashboard/tasks`.

## Included data model

- `departments`: organization-scoped department names and descriptions.
- `projects`: lifecycle status, priority, optional department and dates.
- `tasks`: lifecycle status, priority, optional project, member assignee and due date.
- `task_comments`: organization-scoped comments attached to tasks.
- `workspace_activity`: read policy for organization members; direct client writes are intentionally not enabled.

## Security notes

- Each workspace table has RLS enabled.
- Reads are scoped to active memberships in the same organization.
- Department/project management is limited to owner/admin/manager roles.
- Active members can create tasks; updates are limited to managers, the assignee, or the task creator.
- Composite foreign keys prevent cross-organization project, department, and assignee references.
- The current UI is read-only. Future mutations should validate membership and authorization server-side, write audit/activity events, and be tested with multiple users and organizations before production.

## Verification checklist

- [ ] Migration 0001 succeeded.
- [ ] Migration 0002 succeeded.
- [ ] An active member can see only their organization's projects/tasks.
- [ ] A user from a different organization cannot read these rows.
- [ ] A member cannot create or manage departments/projects unless their role permits it.
- [ ] A member cannot assign a task to a user outside the same organization.
