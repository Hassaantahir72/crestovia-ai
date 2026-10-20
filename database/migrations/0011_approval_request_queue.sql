create table if not exists public.action_approval_requests (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 requested_by uuid not null,
 action_type text not null check (action_type in ('external_write','send_email','send_message','calendar_change','data_export','other')),
 summary text not null check (length(trim(summary)) between 3 and 200),
 details text not null default '' check (length(details)<=4000),
 status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled','expired')),
 reviewed_by uuid references auth.users(id) on delete set null,
 review_note text not null default '' check (length(review_note)<=1000),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 expires_at timestamptz not null default (now()+interval '7 days'),
 foreign key (organization_id,requested_by) references public.memberships(organization_id,user_id) on delete cascade
);
create index if not exists action_approval_requests_org_status_created_idx on public.action_approval_requests(organization_id,status,created_at desc);
create index if not exists action_approval_requests_requester_created_idx on public.action_approval_requests(requested_by,created_at desc);
alter table public.action_approval_requests enable row level security;
revoke all on public.action_approval_requests from anon;
grant select,insert,update on public.action_approval_requests to authenticated;
create policy "requesters and owners read approval requests" on public.action_approval_requests for select to authenticated using (requested_by=(select auth.uid()) or app_private.is_org_owner(organization_id));
create policy "active members request approvals" on public.action_approval_requests for insert to authenticated with check (requested_by=(select auth.uid()) and status='pending' and reviewed_by is null and reviewed_at is null and exists(select 1 from public.memberships m where m.organization_id=action_approval_requests.organization_id and m.user_id=(select auth.uid()) and m.status='active'));
create policy "organization owners review approval requests" on public.action_approval_requests for update to authenticated using (app_private.is_org_owner(organization_id)) with check (app_private.is_org_owner(organization_id));
