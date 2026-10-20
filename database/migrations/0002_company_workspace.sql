-- Crestovia AI Phase 2: organization-scoped company workspace.
-- Apply only after 0001_foundation.sql has succeeded.
-- Designed for Supabase/PostgreSQL; review in a test project before real data.

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 100),
  description text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  department_id uuid,
  name text not null check (length(trim(name)) between 2 and 160),
  description text not null default '',
  status text not null default 'active' check (status in ('planned', 'active', 'on_hold', 'completed', 'archived')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  start_date date,
  due_date date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint projects_department_same_org_fk foreign key (organization_id, department_id)
    references public.departments(organization_id, id) on delete set null (department_id),
  constraint projects_dates_check check (due_date is null or start_date is null or due_date >= start_date)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid,
  title text not null check (length(trim(title)) between 2 and 200),
  description text not null default '',
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'blocked', 'in_review', 'done', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assigned_to uuid,
  created_by uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint tasks_project_same_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete set null (project_id),
  constraint tasks_assignee_same_org_fk foreign key (organization_id, assigned_to)
    references public.memberships(organization_id, user_id) on delete set null (assigned_to)
);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null,
  author_id uuid not null references auth.users(id) on delete restrict,
  body text not null check (length(trim(body)) between 1 and 10000),
  created_at timestamptz not null default now(),
  constraint comments_task_same_org_fk foreign key (organization_id, task_id)
    references public.tasks(organization_id, id) on delete cascade
);

create table if not exists public.workspace_activity (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  entity_type text not null check (entity_type in ('department', 'project', 'task', 'comment')),
  entity_id uuid,
  action text not null,
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists departments_org_name_idx on public.departments(organization_id, name);
create unique index if not exists departments_org_lower_name_uidx on public.departments(organization_id, lower(name));
create index if not exists projects_org_status_idx on public.projects(organization_id, status, updated_at desc);
create index if not exists tasks_org_status_due_idx on public.tasks(organization_id, status, due_at nulls last);
create index if not exists tasks_assigned_to_idx on public.tasks(assigned_to, status);
create index if not exists comments_task_created_idx on public.task_comments(task_id, created_at);
create index if not exists workspace_activity_org_created_idx on public.workspace_activity(organization_id, created_at desc);

alter table public.departments enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.workspace_activity enable row level security;

-- Helper predicates use existing membership rows; all access is tenant-scoped.
create policy "active members read departments" on public.departments
for select to authenticated using (exists (
  select 1 from public.memberships m where m.organization_id = departments.organization_id
    and m.user_id = (select auth.uid()) and m.status = 'active'
));
create policy "admins manage departments" on public.departments
for all to authenticated using (exists (
  select 1 from public.memberships m where m.organization_id = departments.organization_id
    and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('owner','admin','manager')
)) with check (exists (
  select 1 from public.memberships m where m.organization_id = departments.organization_id
    and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('owner','admin','manager')
));

create policy "active members read projects" on public.projects
for select to authenticated using (exists (
  select 1 from public.memberships m where m.organization_id = projects.organization_id
    and m.user_id = (select auth.uid()) and m.status = 'active'
));
create policy "managers manage projects" on public.projects
for all to authenticated using (exists (
  select 1 from public.memberships m where m.organization_id = projects.organization_id
    and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('owner','admin','manager')
)) with check (exists (
  select 1 from public.memberships m where m.organization_id = projects.organization_id
    and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('owner','admin','manager')
));

create policy "active members read tasks" on public.tasks
for select to authenticated using (exists (
  select 1 from public.memberships m where m.organization_id = tasks.organization_id
    and m.user_id = (select auth.uid()) and m.status = 'active'
));
create policy "active members create tasks" on public.tasks
for insert to authenticated with check (
  created_by = (select auth.uid()) and exists (
    select 1 from public.memberships m where m.organization_id = tasks.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
  )
);
create policy "assignees and managers update tasks" on public.tasks
for update to authenticated using (exists (
  select 1 from public.memberships m where m.organization_id = tasks.organization_id
    and m.user_id = (select auth.uid()) and m.status = 'active'
    and (m.role in ('owner','admin','manager') or tasks.assigned_to = (select auth.uid()) or tasks.created_by = (select auth.uid()))
)) with check (exists (
  select 1 from public.memberships m where m.organization_id = tasks.organization_id
    and m.user_id = (select auth.uid()) and m.status = 'active'
    and (m.role in ('owner','admin','manager') or tasks.assigned_to = (select auth.uid()) or tasks.created_by = (select auth.uid()))
));

create policy "active members read task comments" on public.task_comments
for select to authenticated using (exists (
  select 1 from public.memberships m where m.organization_id = task_comments.organization_id
    and m.user_id = (select auth.uid()) and m.status = 'active'
));
create policy "active members comment on tasks" on public.task_comments
for insert to authenticated with check (author_id = (select auth.uid()) and exists (
  select 1 from public.memberships m where m.organization_id = task_comments.organization_id
    and m.user_id = (select auth.uid()) and m.status = 'active'
));
create policy "authors delete own comments" on public.task_comments
for delete to authenticated using (author_id = (select auth.uid()) and exists (
  select 1 from public.memberships m where m.organization_id = task_comments.organization_id
    and m.user_id = (select auth.uid()) and m.status = 'active'
));

create policy "active members read workspace activity" on public.workspace_activity
for select to authenticated using (exists (
  select 1 from public.memberships m where m.organization_id = workspace_activity.organization_id
    and m.user_id = (select auth.uid()) and m.status = 'active'
));
-- No direct client write policies for activity; trusted server-side actions will write it.
