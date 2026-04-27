-- Ensure Realtime broadcasts changes on time_blocks so the client refreshes
-- automatically when the sync function writes rows.
do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'time_blocks'
  ) then
    alter publication supabase_realtime add table time_blocks;
  end if;
end $$;
