-- Bloom CRM — Supabase Schema
-- Run this in your Supabase SQL Editor to initialize the database.

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── Contacts ────────────────────────────────────────────────────────────────
create table if not exists contacts (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text,
  phone        text,
  company      text,
  tags         text[] default '{}',
  notes        text,
  avatar_color text default '#e8829a',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table if not exists payments (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid references contacts(id) on delete cascade,
  amount      numeric(10,2) not null,
  status      text check (status in ('outstanding','upcoming','paid')) default 'upcoming',
  due_date    date,
  description text not null,
  created_at  timestamptz default now()
);

-- ─── Habits ──────────────────────────────────────────────────────────────────
create table if not exists habits (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  color       text default '#e8829a',
  icon        text,
  order_index int default 0,
  created_at  timestamptz default now()
);

create table if not exists habit_completions (
  id             uuid primary key default gen_random_uuid(),
  habit_id       uuid references habits(id) on delete cascade,
  completed_date date not null,
  unique (habit_id, completed_date)
);

-- ─── To-Dos ──────────────────────────────────────────────────────────────────
create table if not exists todos (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  priority    text check (priority in ('low','medium','high')) default 'medium',
  due_date    date,
  completed   boolean default false,
  tags        text[] default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─── Goals ───────────────────────────────────────────────────────────────────
create table if not exists goals (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  category    text default 'Personal',
  progress    int default 0 check (progress >= 0 and progress <= 100),
  target_date date,
  color       text default '#e8829a',
  created_at  timestamptz default now()
);

create table if not exists milestones (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid references goals(id) on delete cascade,
  title       text not null,
  completed   boolean default false,
  order_index int default 0
);

-- ─── Notes ───────────────────────────────────────────────────────────────────
create table if not exists notes (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  content    text default '',
  tags       text[] default '{}',
  pinned     boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Transactions ─────────────────────────────────────────────────────────────
create table if not exists transactions (
  id          uuid primary key default gen_random_uuid(),
  amount      numeric(10,2) not null,
  type        text check (type in ('income','expense')) not null,
  category    text not null,
  description text not null,
  date        date not null,
  created_at  timestamptz default now()
);

-- ─── Documents ───────────────────────────────────────────────────────────────
create table if not exists documents (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  folder      text default 'General',
  url         text,
  file_type   text,
  size_bytes  bigint,
  notes       text,
  created_at  timestamptz default now()
);

-- ─── Time Blocks (Calendar) ──────────────────────────────────────────────────
create table if not exists time_blocks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  category     text default 'Work',
  start_time   timestamptz not null,
  end_time     timestamptz not null,
  color        text default '#e8829a',
  repeat_until date,
  repeat_id    uuid,
  created_at   timestamptz default now()
);
-- Run this if you already have the table: alter table time_blocks add column if not exists repeat_id uuid;

-- ─── Row Level Security (RLS) — single-user app, use anon key ───────────────
-- These policies allow full access via the anon key (fine for single-user app).
-- For added security, use Supabase Auth and restrict to authenticated users.

alter table contacts enable row level security;
alter table payments enable row level security;
alter table habits enable row level security;
alter table habit_completions enable row level security;
alter table todos enable row level security;
alter table goals enable row level security;
alter table milestones enable row level security;
alter table notes enable row level security;
alter table transactions enable row level security;
alter table documents enable row level security;
alter table time_blocks enable row level security;

-- Allow all operations (single-user, no auth required)
create policy "allow_all" on contacts for all using (true) with check (true);
create policy "allow_all" on payments for all using (true) with check (true);
create policy "allow_all" on habits for all using (true) with check (true);
create policy "allow_all" on habit_completions for all using (true) with check (true);
create policy "allow_all" on todos for all using (true) with check (true);
create policy "allow_all" on goals for all using (true) with check (true);
create policy "allow_all" on milestones for all using (true) with check (true);
create policy "allow_all" on notes for all using (true) with check (true);
create policy "allow_all" on transactions for all using (true) with check (true);
create policy "allow_all" on documents for all using (true) with check (true);
create policy "allow_all" on time_blocks for all using (true) with check (true);

-- ─── Academics (Courses + Assignments) ───────────────────────────────────────
create table if not exists courses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  instructor  text,
  credits     int,
  color       text default '#e8829a',
  semester    text default '',
  created_at  timestamptz default now()
);

create table if not exists assignments (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid references courses(id) on delete cascade,
  title       text not null,
  type        text check (type in ('homework','exam','project','quiz','other')) default 'homework',
  due_date    date,
  grade       numeric(5,2),
  max_grade   numeric(5,2) default 100,
  completed   boolean default false,
  notes       text,
  created_at  timestamptz default now()
);

alter table courses enable row level security;
alter table assignments enable row level security;
create policy "allow_all" on courses for all using (true) with check (true);
create policy "allow_all" on assignments for all using (true) with check (true);
