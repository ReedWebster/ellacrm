-- Per-calendar push notification subscriptions (Google events.watch).
-- One row per (user, calendar). Channel id is what we tell Google; we use it
-- to look up the right user/calendar when Google POSTs to our webhook.
create table if not exists calendar_watches (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  calendar_external_id text not null,
  external_provider    text not null default 'google',
  channel_id           text not null unique,
  resource_id          text not null,
  expires_at           timestamptz not null,
  created_at           timestamptz default now(),
  unique (user_id, external_provider, calendar_external_id)
);
alter table calendar_watches enable row level security;
create policy "calendar_watches_select_own"
  on calendar_watches for select using (auth.uid() = user_id);
