-- Allow the tracked invitation record to represent every role accepted by memberships.
alter table public.organization_invitations
  drop constraint if exists organization_invitations_role_check;

alter table public.organization_invitations
  add constraint organization_invitations_role_check
  check (role in ('owner', 'admin', 'manager', 'member', 'guest'));
