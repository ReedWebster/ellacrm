-- Per-user calendar metadata: name, color, visibility, primary flag.
-- Populated by the sync function from Google's calendarList.
create table if not exists calendar_subscriptions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  external_id       text not null,
  external_provider text not null default 'google',
  name              text not null,
  color             text default '#4285F4',
  visible           boolean not null default true,
  is_primary        boolean default false,
  access_role       text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  unique (user_id, external_provider, external_id)
);

alter table calendar_subscriptions enable row level security;

drop policy if exists "calendar_subscriptions_select_own" on calendar_subscriptions;
create policy "calendar_subscriptions_select_own"
  on calendar_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "calendar_subscriptions_update_own" on calendar_subscriptions;
create policy "calendar_subscriptions_update_own"
  on calendar_subscriptions for update
  using (auth.uid() = user_id);

drop policy if exists "calendar_subscriptions_delete_own" on calendar_subscriptions;
create policy "calendar_subscriptions_delete_own"
  on calendar_subscriptions for delete
  using (auth.uid() = user_id);

drop trigger if exists calendar_subscriptions_set_updated_at on calendar_subscriptions;
create trigger calendar_subscriptions_set_updated_at
  before update on calendar_subscriptions
  for each row execute function set_updated_at();

-- Tag each synced event with its source calendar
alter table time_blocks add column if not exists calendar_external_id text;
create index if not exists time_blocks_calendar_external_id_idx
  on time_blocks (calendar_external_id) where calendar_external_id is not null;

-- Realtime so the sidebar reflects sync changes
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'calendar_subscriptions'
  ) then
    alter publication supabase_realtime add table calendar_subscriptions;
  end if;
end $$;
