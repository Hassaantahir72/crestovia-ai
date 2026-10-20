-- Replace the exposed SECURITY DEFINER organization bootstrap with an invoker-safe workflow.
-- All inserts below are constrained by RLS policies and the authenticated user's own identity.

drop policy if exists "creators read own organizations during bootstrap" on public.organizations;
create policy "creators read own organizations during bootstrap"
on public.organizations for select to authenticated
using (created_by = (select auth.uid()));

drop policy if exists "users create organizations" on public.organizations;
create policy "users create organizations"
on public.organizations for insert to authenticated
with check (created_by = (select auth.uid()));

drop policy if exists "users bootstrap their own owner membership" on public.memberships;
create policy "users bootstrap their own owner membership"
on public.memberships for insert to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and status = 'active'
  and exists (
    select 1 from public.organizations o
    where o.id = memberships.organization_id
      and o.created_by = (select auth.uid())
  )
);

create or replace function public.create_organization(p_name text, p_slug text)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
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
  values (v_user_id, coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', ''))
  on conflict (user_id) do nothing;

  return v_org_id;
end;
$$;

revoke all on function public.create_organization(text, text) from public;
revoke all on function public.create_organization(text, text) from anon;
grant execute on function public.create_organization(text, text) to authenticated;
