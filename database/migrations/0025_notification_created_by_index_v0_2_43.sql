-- Crestovia AI v0.2.43: cover the notification creator foreign key.
create index if not exists notifications_created_by_idx
  on public.notifications(created_by);
