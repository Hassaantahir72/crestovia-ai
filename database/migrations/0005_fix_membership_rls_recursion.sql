-- Replace self-referencing membership RLS predicates with a non-exposed helper.
-- This avoids infinite recursion when the membership policy checks whether its caller is an owner.
create schema if not exists app_private;
revoke all on schema app_private from public;
revoke all on schema app_private from anon;
grant usage on schema app_private to authenticated;
create or replace function app_private.is_org_owner(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $function$
  select exists (select 1 from public.memberships m
    where m.organization_id = p_organization_id and m.user_id = (select auth.uid())
      and m.status = 'active' and m.role = 'owner');
$function$;
revoke all on function app_private.is_org_owner(uuid) from public;
revoke all on function app_private.is_org_owner(uuid) from anon;
grant execute on function app_private.is_org_owner(uuid) to authenticated;
drop policy if exists "users read own memberships or owner reads organization members" on public.memberships;
create policy "users read own memberships or owner reads organization members" on public.memberships
for select to authenticated using (user_id = (select auth.uid()) or app_private.is_org_owner(organization_id));
drop policy if exists "organization owners manage memberships" on public.memberships;
create policy "organization owners manage memberships" on public.memberships
for all to authenticated using (app_private.is_org_owner(organization_id))
with check (app_private.is_org_owner(organization_id));
drop policy if exists "only organization owners read audit logs" on public.audit_logs;
create policy "only organization owners read audit logs" on public.audit_logs
for select to authenticated using (organization_id is not null and app_private.is_org_owner(organization_id));
