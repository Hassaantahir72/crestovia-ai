-- Crestovia AI v0.3.9: private direct messages and optional WhatsApp Cloud API ledger.
-- Requires 0037_native_team_chat_foundation_v0_3_8.sql.

create or replace function public.create_direct_team_channel(
  p_organization_id uuid,
  p_other_user_id uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_channel_id uuid;
  v_slug text;
begin
  if v_me is null or p_other_user_id is null or p_other_user_id = v_me then
    raise exception 'invalid_direct_conversation';
  end if;
  if not exists (
    select 1 from public.memberships m
    where m.organization_id = p_organization_id and m.user_id = v_me and m.status = 'active'
  ) or not exists (
    select 1 from public.memberships m
    where m.organization_id = p_organization_id and m.user_id = p_other_user_id and m.status = 'active'
  ) then
    raise exception 'active_same_organization_membership_required';
  end if;

  select c.id into v_channel_id
  from public.team_channels c
  where c.organization_id = p_organization_id
    and c.visibility = 'private' and c.channel_type = 'direct'
    and exists (
      select 1 from public.team_channel_members cm
      where cm.organization_id = p_organization_id and cm.channel_id = c.id and cm.user_id = v_me
    )
    and exists (
      select 1 from public.team_channel_members cm
      where cm.organization_id = p_organization_id and cm.channel_id = c.id and cm.user_id = p_other_user_id
    )
  limit 1;
  if v_channel_id is not null then return v_channel_id; end if;

  v_slug := 'direct-' || replace(gen_random_uuid()::text, '-', '');
  insert into public.team_channels(
    organization_id, name, slug, description, visibility, channel_type, created_by
  ) values (
    p_organization_id, 'Direct message', v_slug, '', 'private', 'direct', v_me
  ) returning id into v_channel_id;

  insert into public.team_channel_members(organization_id, channel_id, user_id, added_by)
  values
    (p_organization_id, v_channel_id, v_me, v_me),
    (p_organization_id, v_channel_id, p_other_user_id, v_me);
  return v_channel_id;
end;
$$;
revoke all on function public.create_direct_team_channel(uuid, uuid) from public, anon;
grant execute on function public.create_direct_team_channel(uuid, uuid) to authenticated;

create table if not exists public.whatsapp_message_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_message_id text unique,
  direction text not null check (direction in ('inbound','outbound')),
  from_phone text not null check (length(from_phone) between 3 and 32),
  to_phone text not null check (length(to_phone) between 3 and 32),
  message_text text not null default '' check (length(message_text) <= 4000),
  status text not null default 'received' check (status in ('received','sent','failed','delivered','read','unknown')),
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_events_org_created_idx
  on public.whatsapp_message_events(organization_id, created_at desc);
alter table public.whatsapp_message_events enable row level security;
revoke all on public.whatsapp_message_events from anon, authenticated;
grant select on public.whatsapp_message_events to authenticated;
grant all on public.whatsapp_message_events to service_role;
drop policy if exists "owners and admins read organization WhatsApp events" on public.whatsapp_message_events;
create policy "owners and admins read organization WhatsApp events"
on public.whatsapp_message_events for select to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = whatsapp_message_events.organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active' and m.role in ('owner','admin')
  )
);
