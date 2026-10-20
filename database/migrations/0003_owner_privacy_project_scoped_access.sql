-- Crestovia AI Phase 2 security increment: owner-private records and explicit project assignments.
-- Apply after 0001_foundation.sql and 0002_company_workspace.sql.
create table if not exists public.project_memberships (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, project_id uuid not null, user_id uuid not null,
 access_level text not null default 'contributor' check (access_level in ('viewer','contributor','manager')),
 assigned_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(),
 unique(project_id,user_id),
 foreign key(organization_id,project_id) references public.projects(organization_id,id) on delete cascade,
 foreign key(organization_id,user_id) references public.memberships(organization_id,user_id) on delete cascade
);
create index if not exists project_memberships_user_project_idx on public.project_memberships(user_id,project_id);
create index if not exists project_memberships_org_project_idx on public.project_memberships(organization_id,project_id);
create table if not exists public.owner_private_items (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 category text not null check(length(trim(category)) between 1 and 80),
 title text not null default '' check(length(title)<=200), payload jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists owner_private_items_owner_category_idx on public.owner_private_items(owner_id,category,updated_at desc);
alter table public.project_memberships enable row level security;
alter table public.owner_private_items enable row level security;
drop policy if exists "users read own project assignments" on public.project_memberships;
drop policy if exists "organization owners manage project assignments" on public.project_memberships;
create policy "users read own project assignments" on public.project_memberships for select to authenticated using (
 user_id=(select auth.uid()) or exists(select 1 from public.memberships m where m.organization_id=project_memberships.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role='owner'));
create policy "organization owners manage project assignments" on public.project_memberships for all to authenticated using (
 exists(select 1 from public.memberships m where m.organization_id=project_memberships.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role='owner'))
 with check (exists(select 1 from public.memberships m where m.organization_id=project_memberships.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role='owner'));
drop policy if exists "owner manages only their private items" on public.owner_private_items;
create policy "owner manages only their private items" on public.owner_private_items for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
drop policy if exists "active members read departments" on public.departments;
drop policy if exists "admins manage departments" on public.departments;
drop policy if exists "active members read projects" on public.projects;
drop policy if exists "managers manage projects" on public.projects;
drop policy if exists "active members read tasks" on public.tasks;
drop policy if exists "active members create tasks" on public.tasks;
drop policy if exists "assignees and managers update tasks" on public.tasks;
drop policy if exists "active members read task comments" on public.task_comments;
drop policy if exists "active members comment on tasks" on public.task_comments;
drop policy if exists "authors delete own comments" on public.task_comments;
drop policy if exists "active members read workspace activity" on public.workspace_activity;
create policy "owner or assigned project members read departments" on public.departments for select to authenticated using (
 exists(select 1 from public.memberships m where m.organization_id=departments.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role='owner')
 or exists(select 1 from public.projects p join public.project_memberships pm on pm.organization_id=p.organization_id and pm.project_id=p.id join public.memberships m on m.organization_id=pm.organization_id and m.user_id=pm.user_id where p.organization_id=departments.organization_id and p.department_id=departments.id and pm.user_id=(select auth.uid()) and m.status='active'));
create policy "only owner manages departments" on public.departments for all to authenticated using (
 exists(select 1 from public.memberships m where m.organization_id=departments.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role='owner'))
 with check (exists(select 1 from public.memberships m where m.organization_id=departments.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role='owner'));
create policy "owner or assigned members read projects" on public.projects for select to authenticated using (
 exists(select 1 from public.memberships m where m.organization_id=projects.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role='owner')
 or exists(select 1 from public.project_memberships pm join public.memberships m on m.organization_id=pm.organization_id and m.user_id=pm.user_id where pm.organization_id=projects.organization_id and pm.project_id=projects.id and pm.user_id=(select auth.uid()) and m.status='active'));
create policy "owner or assigned project managers update projects" on public.projects for update to authenticated using (
 exists(select 1 from public.memberships m where m.organization_id=projects.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role='owner')
 or exists(select 1 from public.project_memberships pm join public.memberships m on m.organization_id=pm.organization_id and m.user_id=pm.user_id where pm.organization_id=projects.organization_id and pm.project_id=projects.id and pm.user_id=(select auth.uid()) and pm.access_level='manager' and m.status='active'))
 with check (exists(select 1 from public.memberships m where m.organization_id=projects.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role='owner') or exists(select 1 from public.project_memberships pm join public.memberships m on m.organization_id=pm.organization_id and m.user_id=pm.user_id where pm.organization_id=projects.organization_id and pm.project_id=projects.id and pm.user_id=(select auth.uid()) and pm.access_level='manager' and m.status='active'));
create policy "owner creates projects" on public.projects for insert to authenticated with check (created_by=(select auth.uid()) and exists(select 1 from public.memberships m where m.organization_id=projects.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role='owner'));
create policy "owner deletes projects" on public.projects for delete to authenticated using (exists(select 1 from public.memberships m where m.organization_id=projects.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role='owner'));
create policy "owner or assigned members read tasks" on public.tasks for select to authenticated using (
 exists(select 1 from public.memberships m where m.organization_id=tasks.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role='owner')
 or assigned_to=(select auth.uid()) or created_by=(select auth.uid())
 or exists(select 1 from public.project_memberships pm join public.memberships m on m.organization_id=pm.organization_id and m.user_id=pm.user_id where pm.organization_id=tasks.organization_id and pm.project_id=tasks.project_id and pm.user_id=(select auth.uid()) and m.status='active'));
create policy "owner or assigned contributors create tasks" on public.tasks for insert to authenticated with check (
 created_by=(select auth.uid()) and exists(select 1 from public.memberships m where m.organization_id=tasks.organization_id and m.user_id=(select auth.uid()) and m.status='active')
 and (exists(select 1 from public.memberships m where m.organization_id=tasks.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role='owner')
 or exists(select 1 from public.project_memberships pm join public.memberships m on m.organization_id=pm.organization_id and m.user_id=pm.user_id where pm.organization_id=tasks.organization_id and pm.project_id=tasks.project_id and pm.user_id=(select auth.uid()) and pm.access_level in ('contributor','manager') and m.status='active')));
create policy "owner or assigned contributors update tasks" on public.tasks for update to authenticated using (
 exists(select 1 from public.memberships m where m.organization_id=tasks.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role='owner')
 or assigned_to=(select auth.uid()) or created_by=(select auth.uid())
 or exists(select 1 from public.project_memberships pm join public.memberships m on m.organization_id=pm.organization_id and m.user_id=pm.user_id where pm.organization_id=tasks.organization_id and pm.project_id=tasks.project_id and pm.user_id=(select auth.uid()) and pm.access_level in ('contributor','manager') and m.status='active'))
 with check (exists(select 1 from public.memberships m where m.organization_id=tasks.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role='owner')
 or (created_by=(select auth.uid()) and exists(select 1 from public.memberships m where m.organization_id=tasks.organization_id and m.user_id=(select auth.uid()) and m.status='active'))
 or (assigned_to=(select auth.uid()) and exists(select 1 from public.memberships m where m.organization_id=tasks.organization_id and m.user_id=(select auth.uid()) and m.status='active'))
 or exists(select 1 from public.project_memberships pm join public.memberships m on m.organization_id=pm.organization_id and m.user_id=pm.user_id where pm.organization_id=tasks.organization_id and pm.project_id=tasks.project_id and pm.user_id=(select auth.uid()) and pm.access_level in ('contributor','manager') and m.status='active'));
create policy "owner deletes tasks" on public.tasks for delete to authenticated using (exists(select 1 from public.memberships m where m.organization_id=tasks.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role='owner'));
create policy "owner or task viewers read comments" on public.task_comments for select to authenticated using (exists(select 1 from public.tasks t where t.id=task_comments.task_id and t.organization_id=task_comments.organization_id));
create policy "owner or task contributors add comments" on public.task_comments for insert to authenticated with check (
 author_id=(select auth.uid()) and exists(select 1 from public.tasks t where t.id=task_comments.task_id and t.organization_id=task_comments.organization_id and
 (t.assigned_to=(select auth.uid()) or t.created_by=(select auth.uid())
 or exists(select 1 from public.memberships m where m.organization_id=t.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role='owner')
 or exists(select 1 from public.project_memberships pm join public.memberships m on m.organization_id=pm.organization_id and m.user_id=pm.user_id where pm.organization_id=t.organization_id and pm.project_id=t.project_id and pm.user_id=(select auth.uid()) and pm.access_level in ('contributor','manager') and m.status='active'))));
create policy "authors delete own comments" on public.task_comments for delete to authenticated using(author_id=(select auth.uid()));
create policy "owner or scoped members read activity" on public.workspace_activity for select to authenticated using (
 exists(select 1 from public.memberships m where m.organization_id=workspace_activity.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role='owner')
 or (entity_type='project' and exists(select 1 from public.projects p where p.id=workspace_activity.entity_id and p.organization_id=workspace_activity.organization_id))
 or (entity_type='task' and exists(select 1 from public.tasks t where t.id=workspace_activity.entity_id and t.organization_id=workspace_activity.organization_id))
 or (entity_type='comment' and exists(select 1 from public.task_comments c where c.id=workspace_activity.entity_id and c.organization_id=workspace_activity.organization_id))
 or (entity_type='department' and exists(select 1 from public.departments d where d.id=workspace_activity.entity_id and d.organization_id=workspace_activity.organization_id)));
