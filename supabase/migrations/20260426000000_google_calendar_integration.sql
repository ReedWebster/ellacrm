-- Google Calendar two-way sync schema
-- Adds: calendar_integrations table + external_* columns on time_blocks

create table if not exists calendar_integrations (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  provider          text not null default 'google',
  google_email      text not null,
  refresh_token     text not null,
  access_token      text,
  token_expires_at  timestamptz,
  sync_token        text,
  watch_channel_id  text,
  watch_resource_id text,
  watch_expires_at  timestamptz,
  last_synced_at    timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  unique (user_id, provider)
);

alter table calendar_integrations enable row level security;

-- Users can read their own integration row; service role bypasses RLS for writes
drop policy if exists "calendar_integrations_select_own" on calendar_integrations;
create policy "calendar_integrations_select_own"
  on calendar_integrations for select
  using (auth.uid() = user_id);

drop policy if exists "calendar_integrations_delete_own" on calendar_integrations;
create policy "calendar_integrations_delete_own"
  on calendar_integrations for delete
  using (auth.uid() = user_id);

-- Extend time_blocks with external mapping
alter table time_blocks
  add column if not exists external_id       text,
  add column if not exists external_etag     text,
  add column if not exists external_provider text,
  add column if not exists last_synced_at    timestamptz,
  add column if not exists user_id           uuid references auth.users(id) on delete cascade;

create index if not exists time_blocks_external_id_idx
  on time_blocks (external_id) where external_id is not null;

create index if not exists time_blocks_user_id_idx
  on time_blocks (user_id) where user_id is not null;

-- Trigger to keep updated_at fresh on calendar_integrations
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists calendar_integrations_set_updated_at on calendar_integrations;
create trigger calendar_integrations_set_updated_at
  before update on calendar_integrations
  for each row execute function set_updated_at();
