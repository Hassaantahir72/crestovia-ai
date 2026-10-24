-- Crestovia AI v0.3.6: organization-scoped internal team chat and WhatsApp bridge ledger.
create table if not exists public.team_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('channel','direct')),
  name text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_conversations_name_check check (
    (kind = 'channel' and name is not null and length(trim(name)) between 2 and 80)
    or (kind = 'direct' and name is null)
  ),
  unique (organization_id, id),
  foreign key (organization_id, created_by)
    references public.memberships(organization_id, user_id) on delete cascade
);
create index if not exists team_conversations_org_updated_idx
  on public.team_conversations(organization_id, updated_at desc);

create table if not exists public.team_conversation_members (
  organization_id uuid not null,
  conversation_id uuid not null,
  user_id uuid not null,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id),
  foreign key (organization_id, conversation_id)
    references public.team_conversations(organization_id, id) on delete cascade,
  foreign key (organization_id, user_id)
    references public.memberships(organization_id, user_id) on delete cascade
);
create index if not exists team_conversation_members_user_idx
  on public.team_conversation_members(organization_id, user_id, conversation_id);

create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  conversation_id uuid not null,
  author_id uuid not null,
  body text not null check (length(trim(body)) between 1 and 12000),
  created_at timestamptz not null default now(),
  foreign key (organization_id, conversation_id)
    references public.team_conversations(organization_id, id) on delete cascade,
  foreign key (organization_id, author_id)
    references public.memberships(organization_id, user_id) on delete cascade
);
create index if not exists team_messages_conversation_created_idx
  on public.team_messages(organization_id, conversation_id, created_at desc);

alter table public.team_conversations enable row level security;
alter table public.team_conversation_members enable row level security;
alter table public.team_messages enable row level security;

revoke all on public.team_conversations, public.team_conversation_members, public.team_messages from anon, authenticated;
grant select, insert on public.team_conversations to authenticated;
grant update (updated_at) on public.team_conversations to authenticated;
grant select, insert on public.team_conversation_members to authenticated;
grant select, insert on public.team_messages to authenticated;
grant all on public.team_conversations, public.team_conversation_members, public.team_messages to service_role;

create policy "active organization members read team channels and their direct chats"
on public.team_conversations for select to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = team_conversations.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
  )
  and (
    kind = 'channel'
    or exists (
      select 1 from public.team_conversation_members cm
      where cm.organization_id = team_conversations.organization_id
        and cm.conversation_id = team_conversations.id
        and cm.user_id = (select auth.uid())
    )
  )
);

create policy "active members update team conversation timestamps"
on public.team_conversations for update to authenticated
using (
  exists (select 1 from public.memberships m where m.organization_id = team_conversations.organization_id and m.user_id = (select auth.uid()) and m.status = 'active')
  and (kind = 'channel' or exists (select 1 from public.team_conversation_members cm where cm.organization_id = team_conversations.organization_id and cm.conversation_id = team_conversations.id and cm.user_id = (select auth.uid())))
)
with check (
  exists (select 1 from public.memberships m where m.organization_id = team_conversations.organization_id and m.user_id = (select auth.uid()) and m.status = 'active')
  and (kind = 'channel' or exists (select 1 from public.team_conversation_members cm where cm.organization_id = team_conversations.organization_id and cm.conversation_id = team_conversations.id and cm.user_id = (select auth.uid())))
);

create policy "authorized members create team channels"
on public.team_conversations for insert to authenticated
with check (
  created_by = (select auth.uid())
  and kind = 'channel'
  and exists (
    select 1 from public.memberships m
    where m.organization_id = team_conversations.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner','admin','manager')
  )
);

create policy "users read their own conversation memberships"
on public.team_conversation_members for select to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.memberships m
    where m.organization_id = team_conversation_members.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
  )
);

create policy "users add themselves to team conversations"
on public.team_conversation_members for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.memberships m
    where m.organization_id = team_conversation_members.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
  )
  and exists (
    select 1 from public.team_conversations c
    where c.id = team_conversation_members.conversation_id
      and c.organization_id = team_conversation_members.organization_id
      and c.kind = 'channel' and c.created_by = (select auth.uid())
  )
);

create policy "members read messages in conversations they can read"
on public.team_messages for select to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = team_messages.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
  )
  and exists (
    select 1 from public.team_conversations c
    where c.id = team_messages.conversation_id
      and c.organization_id = team_messages.organization_id
      and (
        c.kind = 'channel'
        or exists (
          select 1 from public.team_conversation_members cm
          where cm.organization_id = c.organization_id
            and cm.conversation_id = c.id and cm.user_id = (select auth.uid())
        )
      )
  )
);

create policy "members send messages only to accessible conversations"
on public.team_messages for insert to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1 from public.memberships m
    where m.organization_id = team_messages.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
  )
  and exists (
    select 1 from public.team_conversations c
    where c.id = team_messages.conversation_id
      and c.organization_id = team_messages.organization_id
      and (
        (c.kind = 'channel' and exists (
          select 1 from public.memberships m
          where m.organization_id = c.organization_id
            and m.user_id = (select auth.uid()) and m.status = 'active'
        ))
        or (c.kind = 'direct' and exists (
          select 1 from public.team_conversation_members cm
          where cm.organization_id = c.organization_id
            and cm.conversation_id = c.id and cm.user_id = (select auth.uid())
        ))
      )
  )
);

-- A narrow RPC creates a direct conversation only when both users are active
-- members of the same organization. No service-role key is exposed to the browser.
create or replace function public.create_direct_team_conversation(
  p_organization_id uuid,
  p_other_user_id uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_conversation_id uuid;
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

  select c.id into v_conversation_id
  from public.team_conversations c
  where c.organization_id = p_organization_id and c.kind = 'direct'
    and exists (select 1 from public.team_conversation_members cm
      where cm.organization_id = p_organization_id and cm.conversation_id = c.id and cm.user_id = v_me)
    and exists (select 1 from public.team_conversation_members cm
      where cm.organization_id = p_organization_id and cm.conversation_id = c.id and cm.user_id = p_other_user_id)
  limit 1;

  if v_conversation_id is not null then return v_conversation_id; end if;

  insert into public.team_conversations(organization_id, kind, name, created_by)
  values (p_organization_id, 'direct', null, v_me)
  returning id into v_conversation_id;

  insert into public.team_conversation_members(organization_id, conversation_id, user_id)
  values (p_organization_id, v_conversation_id, v_me),
         (p_organization_id, v_conversation_id, p_other_user_id);
  return v_conversation_id;
end;
$$;
revoke all on function public.create_direct_team_conversation(uuid, uuid) from public, anon;
grant execute on function public.create_direct_team_conversation(uuid, uuid) to authenticated;

-- WhatsApp events are kept separate from internal team conversations. Only
-- owners/admins can read them in-app; inbound webhook writes use service_role.
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
