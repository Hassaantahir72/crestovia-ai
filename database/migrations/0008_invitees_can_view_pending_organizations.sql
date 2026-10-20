drop policy if exists "invitees can read invited organizations" on public.organizations;
create policy "invitees can read invited organizations"
on public.organizations for select to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = organizations.id
      and m.user_id = (select auth.uid())
      and m.status = 'invited'
  )
);
