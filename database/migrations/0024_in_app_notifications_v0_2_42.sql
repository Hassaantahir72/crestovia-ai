-- Crestovia AI v0.2.42: private in-app notifications and idempotent reminder queue.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_id uuid not null,
  created_by uuid references auth.users(id) on delete set null,
  type text not null check (type in ('task_assigned','task_due_soon','task_overdue','approval_reviewed','system')),
  title text not null check (length(trim(title)) between 1 and 160),
  body text not null default '' check (length(body) <= 1000),
  entity_type text check (entity_type in ('task','approval_request','system')),
  entity_id uuid,
  dedupe_key text not null unique,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_recipient_membership_fk
    foreign key (organization_id, recipient_id)
    references public.memberships(organization_id, user_id) on delete cascade
);

create index if not exists notifications_recipient_created_idx
  on public.notifications(organization_id, recipient_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications(organization_id, recipient_id, created_at desc)
  where read_at is null;
create index if not exists tasks_due_reminder_scan_idx
  on public.tasks(due_at, organization_id, assigned_to)
  where due_at is not null and assigned_to is not null and status not in ('done','cancelled');

alter table public.notifications enable row level security;

drop policy if exists "recipients read own notifications" on public.notifications;
create policy "recipients read own notifications" on public.notifications
  for select to authenticated
  using (
    recipient_id = (select auth.uid())
    and exists (
      select 1 from public.memberships m
      where m.organization_id = notifications.organization_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
    )
  );

drop policy if exists "recipients update own notifications" on public.notifications;
create policy "recipients update own notifications" on public.notifications
  for update to authenticated
  using (
    recipient_id = (select auth.uid())
    and exists (
      select 1 from public.memberships m
      where m.organization_id = notifications.organization_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
    )
  )
  with check (
    recipient_id = (select auth.uid())
    and exists (
      select 1 from public.memberships m
      where m.organization_id = notifications.organization_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
    )
  );

drop policy if exists "task creators notify assigned members" on public.notifications;
create policy "task creators notify assigned members" on public.notifications
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and recipient_id <> (select auth.uid())
    and type = 'task_assigned'
    and entity_type = 'task'
    and exists (
      select 1 from public.memberships m
      where m.organization_id = notifications.organization_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
    )
    and exists (
      select 1 from public.tasks t
      where t.id = notifications.entity_id
        and t.organization_id = notifications.organization_id
        and t.assigned_to = notifications.recipient_id
        and (t.created_by = (select auth.uid()) or app_private.is_org_owner(t.organization_id))
    )
  );

revoke all on public.notifications from anon;
grant select, update, insert on public.notifications to authenticated;
grant all on public.notifications to service_role;
