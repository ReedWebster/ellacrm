-- Upsert with onConflict='external_id' requires a unique constraint, not just an index.
-- Drop the existing partial index and replace with a unique constraint.
-- (NULL external_id values won't conflict — Postgres allows multiple NULLs.)

drop index if exists time_blocks_external_id_idx;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'time_blocks_external_id_key'
       and conrelid = 'public.time_blocks'::regclass
  ) then
    alter table time_blocks
      add constraint time_blocks_external_id_key unique (external_id);
  end if;
end $$;
