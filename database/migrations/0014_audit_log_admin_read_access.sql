-- Align audit-log read access with the owner/admin-only audit history UI.
-- Browser clients remain read-only: this migration adds SELECT access only.
drop policy if exists "only organization owners read audit logs" on public.audit_logs;
drop policy if exists "organization owners and admins read audit logs" on public.audit_logs;

create policy "organization owners and admins read audit logs"
on public.audit_logs
for select
to authenticated
using (
  organization_id is not null
  and exists (
    select 1
    from public.memberships m
    where m.organization_id = audit_logs.organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('owner', 'admin')
  )
);
