-- Crestovia AI Phase 1 foundation
-- Run in Supabase SQL editor or through your migration workflow.
-- Review/test in a non-production project before using real company data.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
    id uuid primary key default gen_random_uuid(),
    name text not null check (length(trim(name)) between 2 and 120),
    slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null default '',
    timezone text not null default 'Asia/Karachi',
    preferences jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null default 'member' check (role in ('owner', 'admin', 'manager', 'member', 'guest')),
    status text not null default 'active' check (status in ('invited', 'active', 'suspended')),
    created_at timestamptz not null default now(),
    unique (organization_id, user_id)
);

create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references public.organizations(id) on delete set null,
    actor_id uuid references auth.users(id) on delete set null,
    action text not null,
    entity_type text,
    entity_id uuid,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists memberships_user_id_idx on public.memberships(user_id);
create index if not exists memberships_org_id_idx on public.memberships(organization_id);
create index if not exists audit_logs_org_created_idx on public.audit_logs(organization_id, created_at desc);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.audit_logs enable row level security;

-- A signed-in user can see organizations they belong to.
create policy "members can read their organizations"
on public.organizations for select to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = organizations.id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

-- Only authenticated users can read their own profile.
create policy "users read own profile"
on public.profiles for select to authenticated
using (user_id = (select auth.uid()));

create policy "users insert own profile"
on public.profiles for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "users update own profile"
on public.profiles for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- A member can read their own membership rows. Managers' administrative
-- capabilities are enforced in the backend in later milestones.
create policy "users read own memberships"
on public.memberships for select to authenticated
using (user_id = (select auth.uid()));

-- Audit logs are read-only to ordinary authenticated clients.
-- Writes should be performed through a trusted backend service after authorization.
create policy "members read organization audit logs"
on public.audit_logs for select to authenticated
using (
  organization_id is not null and exists (
    select 1 from public.memberships m
    where m.organization_id = audit_logs.organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('owner', 'admin')
  )
);

-- Intentionally no client-side insert/update/delete policies for organizations,
-- memberships, or audit logs. Organization creation and member administration
-- will be implemented through authorized server-side actions.


-- Secure first-organization bootstrap. A signed-in user may create an
-- organization and becomes its initial owner. Later invitations/admin actions
-- must be implemented as separately authorized workflows.
create or replace function public.create_organization(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_name text := trim(coalesce(p_name, ''));
  v_slug text := lower(trim(coalesce(p_slug, '')));
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if length(v_name) < 2 or length(v_name) > 120 then
    raise exception 'Organization name must be between 2 and 120 characters' using errcode = '22023';
  end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(v_slug) > 80 then
    raise exception 'Slug must contain lowercase letters, numbers, and single hyphens' using errcode = '22023';
  end if;

  insert into public.organizations(name, slug, created_by)
  values (v_name, v_slug, v_user_id)
  returning id into v_org_id;

  insert into public.memberships(organization_id, user_id, role, status)
  values (v_org_id, v_user_id, 'owner', 'active');

  insert into public.profiles(user_id, display_name)
  values (v_user_id, coalesce((select raw_user_meta_data->>'full_name' from auth.users where id = v_user_id), ''))
  on conflict (user_id) do nothing;

  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id)
  values (v_org_id, v_user_id, 'organization.created', 'organization', v_org_id);

  return v_org_id;
end;
$$;

revoke all on function public.create_organization(text, text) from public;
revoke all on function public.create_organization(text, text) from anon;
grant execute on function public.create_organization(text, text) to authenticated;
