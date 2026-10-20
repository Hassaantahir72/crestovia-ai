-- Synced migration for the invitation-tracking table already applied to the connected Supabase project.
-- The current invite action still records invited/active status in public.memberships;
-- wiring this tracking table into invitation and acceptance workflows is a follow-up task.
create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invited_email text not null check (length(trim(invited_email)) between 3 and 254),
  invited_user_id uuid references auth.users(id) on delete set null,
  invited_by uuid references auth.users(id) on delete set null,
  role text not null default 'member' check (role in ('member','guest')),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (organization_id, invited_email)
);
create index if not exists organization_invitations_org_status_idx
  on public.organization_invitations(organization_id, status, created_at desc);
create index if not exists organization_invitations_user_idx
  on public.organization_invitations(invited_user_id) where invited_user_id is not null;
alter table public.organization_invitations enable row level security;
grant select, insert, update, delete on public.organization_invitations to authenticated;
drop policy if exists "organization owners manage invitations" on public.organization_invitations;
create policy "organization owners manage invitations"
  on public.organization_invitations for all to authenticated
  using (app_private.is_org_owner(organization_id))
  with check (app_private.is_org_owner(organization_id));
