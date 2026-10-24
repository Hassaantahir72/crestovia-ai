-- Crestovia AI v0.3.11: cover foreign-key lookup paths introduced by team chat and WhatsApp.
create index if not exists team_channels_org_created_by_idx
  on public.team_channels(organization_id, created_by);
create index if not exists team_channel_members_org_channel_idx
  on public.team_channel_members(organization_id, channel_id);
create index if not exists team_channel_members_org_added_by_idx
  on public.team_channel_members(organization_id, added_by);
create index if not exists team_messages_org_author_idx
  on public.team_messages(organization_id, author_id);
create index if not exists whatsapp_staff_senders_org_created_by_idx
  on public.whatsapp_staff_senders(organization_id, created_by);
