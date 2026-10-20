-- v0.2.30: Consolidate overlapping permissive RLS policies without changing access intent.
-- Preserve owner access for all commands while avoiding FOR ALL policies that overlap SELECT.
-- Policy changes are additive in meaning only; review source regression checks before applying.

-- Departments: SELECT remains owner-or-assigned-project-member. Owners retain write access.
drop policy if exists "only owner manages departments" on public.departments;
create policy "owners insert departments" on public.departments
  for insert to authenticated
  with check (app_private.is_org_owner(organization_id));
create policy "owners update departments" on public.departments
  for update to authenticated
  using (app_private.is_org_owner(organization_id))
  with check (app_private.is_org_owner(organization_id));
create policy "owners delete departments" on public.departments
  for delete to authenticated
  using (app_private.is_org_owner(organization_id));

-- Memberships: retain the existing SELECT predicate (own membership or active org owner).
-- Combine owner writes and safe organization bootstrap into one INSERT policy.
drop policy if exists "organization owners manage memberships" on public.memberships;
create policy "owners or creators insert memberships" on public.memberships
  for insert to authenticated
  with check (
    app_private.is_org_owner(organization_id)
    or (
      user_id = (select auth.uid())
      and role = 'owner'
      and status = 'active'
      and exists (
        select 1 from public.organizations o
        where o.id = memberships.organization_id
          and o.created_by = (select auth.uid())
      )
    )
  );
create policy "organization owners update memberships" on public.memberships
  for update to authenticated
  using (app_private.is_org_owner(organization_id))
  with check (app_private.is_org_owner(organization_id));
create policy "organization owners delete memberships" on public.memberships
  for delete to authenticated
  using (app_private.is_org_owner(organization_id));

-- Organizations: combine creator bootstrap, pending invitee, and active member reads with OR.
drop policy if exists "creators read own organizations during bootstrap" on public.organizations;
drop policy if exists "invitees can read invited organizations" on public.organizations;
drop policy if exists "members can read their organizations" on public.organizations;
create policy "users read organizations by relationship" on public.organizations
  for select to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.memberships m
      where m.organization_id = organizations.id
        and m.user_id = (select auth.uid())
        and m.status = 'invited'
    )
    or exists (
      select 1 from public.memberships m
      where m.organization_id = organizations.id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
    )
  );

-- Project assignments: retain SELECT for self or owner; owners retain write access.
drop policy if exists "organization owners manage project assignments" on public.project_memberships;
create policy "owners insert project assignments" on public.project_memberships
  for insert to authenticated
  with check (app_private.is_org_owner(organization_id));
create policy "owners update project assignments" on public.project_memberships
  for update to authenticated
  using (app_private.is_org_owner(organization_id))
  with check (app_private.is_org_owner(organization_id));
create policy "owners delete project assignments" on public.project_memberships
  for delete to authenticated
  using (app_private.is_org_owner(organization_id));
