-- Crestovia AI v0.3.10: realtime delivery for organization-scoped team messages.
-- Row-level security and authenticated SELECT grants remain the visibility boundary.
do $migration$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'team_messages'
     ) then
    alter publication supabase_realtime add table public.team_messages;
  end if;
end
$migration$;
