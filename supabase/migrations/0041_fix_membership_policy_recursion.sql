-- Fix recursive memberships INSERT policy evaluation during first-workspace onboarding.
-- The old policy selected from public.organizations directly; its SELECT policy
-- queried memberships, causing PostgreSQL error 42P17.
create or replace function app_private.is_org_creator(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.organizations o
    where o.id = p_organization_id
      and o.created_by = (select auth.uid())
  );
$function$;

revoke all on function app_private.is_org_creator(uuid) from public;
grant execute on function app_private.is_org_creator(uuid) to authenticated;

drop policy if exists "owners or creators insert memberships" on public.memberships;
create policy "owners or creators insert memberships"
on public.memberships
for insert
to authenticated
with check (
  app_private.is_org_owner(organization_id)
  or (
    user_id = (select auth.uid())
    and role = 'owner'
    and status = 'active'
    and app_private.is_org_creator(organization_id)
  )
);
