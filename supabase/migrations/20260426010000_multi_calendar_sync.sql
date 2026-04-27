-- Replace single sync_token with per-calendar tokens (jsonb map: calendar_id -> token)
alter table calendar_integrations
  add column if not exists sync_tokens jsonb not null default '{}'::jsonb;

-- Migrate any existing primary token forward
update calendar_integrations
   set sync_tokens = jsonb_build_object('primary', sync_token)
 where sync_token is not null
   and (sync_tokens is null or sync_tokens = '{}'::jsonb);
