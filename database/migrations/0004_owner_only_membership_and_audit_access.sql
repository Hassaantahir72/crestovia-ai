-- Restrict organization membership administration and audit visibility to the owner.
drop policy if exists "users read own memberships" on public.memberships;
create policy "users read own memberships or owner reads organization members" on public.memberships
for select to authenticated using (
 user_id = (select auth.uid())
 or exists (select 1 from public.memberships owner_membership
   where owner_membership.organization_id = memberships.organization_id
     and owner_membership.user_id = (select auth.uid())
     and owner_membership.status = 'active' and owner_membership.role = 'owner')
);
drop policy if exists "organization owners manage memberships" on public.memberships;
create policy "organization owners manage memberships" on public.memberships
for all to authenticated using (
 exists (select 1 from public.memberships owner_membership
   where owner_membership.organization_id = memberships.organization_id
     and owner_membership.user_id = (select auth.uid())
     and owner_membership.status = 'active' and owner_membership.role = 'owner')
) with check (
 exists (select 1 from public.memberships owner_membership
   where owner_membership.organization_id = memberships.organization_id
     and owner_membership.user_id = (select auth.uid())
     and owner_membership.status = 'active' and owner_membership.role = 'owner')
);
drop policy if exists "members read organization audit logs" on public.audit_logs;
create policy "only organization owners read audit logs" on public.audit_logs
for select to authenticated using (
 organization_id is not null and exists (select 1 from public.memberships owner_membership
   where owner_membership.organization_id = audit_logs.organization_id
     and owner_membership.user_id = (select auth.uid())
     and owner_membership.status = 'active' and owner_membership.role = 'owner')
);
