-- v0.2.29: Add indexes for foreign-key lookups flagged by Supabase performance advisor.
-- These are additive, non-destructive indexes; no rows or permissions are changed.
create index if not exists action_approval_requests_org_requested_by_idx
  on public.action_approval_requests (organization_id, requested_by);
create index if not exists action_approval_requests_reviewed_by_idx
  on public.action_approval_requests (reviewed_by);

create index if not exists assistant_messages_conversation_user_idx
  on public.assistant_messages (conversation_id, user_id);
create index if not exists assistant_messages_user_id_idx
  on public.assistant_messages (user_id);

create index if not exists audit_logs_actor_id_idx
  on public.audit_logs (actor_id);
create index if not exists departments_created_by_idx
  on public.departments (created_by);
create index if not exists organization_invitations_invited_by_idx
  on public.organization_invitations (invited_by);
create index if not exists organizations_created_by_idx
  on public.organizations (created_by);

create index if not exists project_memberships_assigned_by_idx
  on public.project_memberships (assigned_by);
create index if not exists project_memberships_org_user_idx
  on public.project_memberships (organization_id, user_id);

create index if not exists projects_created_by_idx
  on public.projects (created_by);
create index if not exists projects_org_department_idx
  on public.projects (organization_id, department_id);

create index if not exists task_comments_org_task_idx
  on public.task_comments (organization_id, task_id);
create index if not exists task_comments_author_id_idx
  on public.task_comments (author_id);
create index if not exists task_comments_organization_id_idx
  on public.task_comments (organization_id);

create index if not exists tasks_org_assignee_idx
  on public.tasks (organization_id, assigned_to);
create index if not exists tasks_created_by_idx
  on public.tasks (created_by);
create index if not exists tasks_org_project_idx
  on public.tasks (organization_id, project_id);

create index if not exists workspace_activity_actor_id_idx
  on public.workspace_activity (actor_id);
