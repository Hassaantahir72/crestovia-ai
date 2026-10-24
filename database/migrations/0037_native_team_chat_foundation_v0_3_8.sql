-- Crestovia AI v0.3.8: organization-scoped native team chat foundation.
-- Apply to staging first. This migration does not create realtime publication entries;
-- live realtime delivery is a separate rollout/acceptance step.

create table if not exists public.team_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 80),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  description text not null default '' check (length(description) <= 500),
  visibility text not null default 'public' check (visibility in ('public','private')),
  channel_type text not null default 'general' check (channel_type in ('general','department','project','direct')),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, slug),
  foreign key (organization_id, created_by)
    references public.memberships(organization_id, user_id) on delete cascade
);

create table if not exists public.team_channel_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  channel_id uuid not null,
  user_id uuid not null,
  added_by uuid,
  created_at timestamptz not null default now(),
  unique (channel_id, user_id),
  foreign key (organization_id, channel_id)
    references public.team_channels(organization_id, id) on delete cascade,
  foreign key (organization_id, user_id)
    references public.memberships(organization_id, user_id) on delete cascade,
  foreign key (organization_id, added_by)
    references public.memberships(organization_id, user_id) on delete set null (added_by)
);

create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  channel_id uuid not null,
  author_id uuid not null,
  body text not null check (length(trim(body)) between 1 and 8000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  foreign key (organization_id, channel_id)
    references public.team_channels(organization_id, id) on delete cascade,
  foreign key (organization_id, author_id)
    references public.memberships(organization_id, user_id) on delete cascade
);

create index if not exists team_channels_org_updated_idx
  on public.team_channels(organization_id, updated_at desc);
create index if not exists team_channel_members_user_idx
  on public.team_channel_members(organization_id, user_id, channel_id);
create index if not exists team_messages_channel_created_idx
  on public.team_messages(organization_id, channel_id, created_at desc);

alter table public.team_channels enable row level security;
alter table public.team_channel_members enable row level security;
alter table public.team_messages enable row level security;

revoke all on public.team_channels from anon;
revoke all on public.team_channel_members from anon;
revoke all on public.team_messages from anon;
grant select, insert, update, delete on public.team_channels to authenticated;
grant select, insert on public.team_channel_members to authenticated;
grant select, insert on public.team_messages to authenticated;

drop policy if exists "active members read visible team channels" on public.team_channels;
create policy "active members read visible team channels" on public.team_channels
for select to authenticated using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = team_channels.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
  )
  and (
    visibility = 'public'
    or exists (
      select 1 from public.team_channel_members cm
      where cm.organization_id = team_channels.organization_id
        and cm.channel_id = team_channels.id and cm.user_id = (select auth.uid())
    )
  )
);

drop policy if exists "managers create team channels" on public.team_channels;
create policy "managers create team channels" on public.team_channels
for insert to authenticated with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.memberships m
    where m.organization_id = team_channels.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner','admin','manager')
  )
);

drop policy if exists "managers update team channels" on public.team_channels;
create policy "managers update team channels" on public.team_channels
for update to authenticated using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = team_channels.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner','admin','manager')
  )
) with check (
  exists (
    select 1 from public.memberships m
    where m.organization_id = team_channels.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner','admin','manager')
  )
);

drop policy if exists "managers delete team channels" on public.team_channels;
create policy "managers delete team channels" on public.team_channels
for delete to authenticated using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = team_channels.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
      and m.role in ('owner','admin','manager')
  )
);

drop policy if exists "members read their channel memberships" on public.team_channel_members;
create policy "members read their channel memberships" on public.team_channel_members
for select to authenticated using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.memberships m
    where m.organization_id = team_channel_members.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
  )
);

drop policy if exists "channel creators or managers add channel members" on public.team_channel_members;
create policy "channel creators or managers add channel members" on public.team_channel_members
for insert to authenticated with check (
  exists (
    select 1 from public.memberships m
    where m.organization_id = team_channel_members.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
  )
  and (
    (user_id = (select auth.uid()) and exists (
      select 1 from public.team_channels c
      where c.organization_id = team_channel_members.organization_id
        and c.id = team_channel_members.channel_id and c.created_by = (select auth.uid())
    ))
    or exists (
      select 1 from public.memberships m
      where m.organization_id = team_channel_members.organization_id
        and m.user_id = (select auth.uid()) and m.status = 'active'
        and m.role in ('owner','admin','manager')
    )
  )
);

drop policy if exists "active members read visible channel messages" on public.team_messages;
create policy "active members read visible channel messages" on public.team_messages
for select to authenticated using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = team_messages.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
  )
  and exists (
    select 1 from public.team_channels c
    where c.organization_id = team_messages.organization_id and c.id = team_messages.channel_id
      and (
        c.visibility = 'public'
        or exists (
          select 1 from public.team_channel_members cm
          where cm.organization_id = c.organization_id and cm.channel_id = c.id
            and cm.user_id = (select auth.uid())
        )
      )
  )
);

drop policy if exists "active members post to visible team channels" on public.team_messages;
create policy "active members post to visible team channels" on public.team_messages
for insert to authenticated with check (
  author_id = (select auth.uid())
  and exists (
    select 1 from public.memberships m
    where m.organization_id = team_messages.organization_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
  )
  and exists (
    select 1 from public.team_channels c
    where c.organization_id = team_messages.organization_id and c.id = team_messages.channel_id
      and (
        c.visibility = 'public'
        or exists (
          select 1 from public.team_channel_members cm
          where cm.organization_id = c.organization_id and cm.channel_id = c.id
            and cm.user_id = (select auth.uid())
        )
      )
  )
);
