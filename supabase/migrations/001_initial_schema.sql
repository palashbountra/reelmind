-- ============================================================
-- ReelMind - Initial Supabase Schema
-- Run this in your Supabase SQL Editor
-- Dashboard → SQL Editor → New query → paste & run
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- REELS TABLE
-- ============================================================
create table if not exists public.reels (
  id            uuid default uuid_generate_v4() primary key,
  user_id       text not null default 'anonymous',
  url           text not null,
  title         text not null default 'Instagram Reel',
  description   text,
  thumbnail_url text,
  author_name   text,
  author_url    text,
  category      text not null default 'other',
  -- Note: no CHECK constraint on category — custom categories are stored in localStorage
  -- and can be any slug string. Validated client-side only.
  tags          text[] not null default '{}',
  status        text not null default 'unread'
                check (status in ('unread','in_progress','done','archived')),
  notes         text,
  ai_summary    text,
  ai_ideas      text[],
  ai_action_items text[],
  reminder_date timestamptz,
  is_favourite  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Index for fast querying
create index if not exists reels_user_id_idx on public.reels (user_id);
create index if not exists reels_category_idx on public.reels (category);
create index if not exists reels_status_idx on public.reels (status);
create index if not exists reels_created_at_idx on public.reels (created_at desc);
create index if not exists reels_is_favourite_idx on public.reels (is_favourite) where is_favourite = true;

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger reels_updated_at
  before update on public.reels
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- TASKS TABLE
-- ============================================================
create table if not exists public.tasks (
  id          uuid default uuid_generate_v4() primary key,
  user_id     text not null default 'anonymous',
  reel_id     uuid references public.reels(id) on delete cascade,
  title       text not null,
  description text,
  is_done     boolean not null default false,
  due_date    timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_reel_id_idx on public.tasks (reel_id);
create index if not exists tasks_is_done_idx on public.tasks (is_done);

-- ============================================================
-- IDEA NOTES TABLE
-- ============================================================
create table if not exists public.idea_notes (
  id         uuid default uuid_generate_v4() primary key,
  user_id    text not null default 'anonymous',
  reel_id    uuid references public.reels(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists idea_notes_reel_id_idx on public.idea_notes (reel_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Enable RLS on all tables
alter table public.reels enable row level security;
alter table public.tasks enable row level security;
alter table public.idea_notes enable row level security;

-- For now (no auth): allow all access to the 'anonymous' user
-- When you add auth later, replace these with proper user policies

-- OPTION A: Open access (development / no-auth mode)
-- Use this if you're not using Supabase Auth yet
create policy "Allow all (dev mode)" on public.reels
  for all using (true) with check (true);

create policy "Allow all (dev mode)" on public.tasks
  for all using (true) with check (true);

create policy "Allow all (dev mode)" on public.idea_notes
  for all using (true) with check (true);

-- ============================================================
-- OPTION B: Auth-based RLS (uncomment when you add Supabase Auth)
-- Replace the policies above with these:
-- ============================================================
/*
drop policy if exists "Allow all (dev mode)" on public.reels;
drop policy if exists "Allow all (dev mode)" on public.tasks;
drop policy if exists "Allow all (dev mode)" on public.idea_notes;

create policy "Users can manage own reels" on public.reels
  for all using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy "Users can manage own tasks" on public.tasks
  for all using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy "Users can manage own notes" on public.idea_notes
  for all using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);
*/

-- ============================================================
-- SAMPLE DATA (optional — remove before production)
-- ============================================================
insert into public.reels (
  title, url, category, status, tags, ai_summary, ai_ideas, ai_action_items, is_favourite
) values (
  'How I built a $10k/month side project in 6 months',
  'https://www.instagram.com/reel/example1/',
  'business',
  'unread',
  array['startup','saas','solopreneur'],
  'A developer shares how they validated, built, and marketed a SaaS product to reach $10k MRR in 6 months using indie hacker principles.',
  array[
    'Apply the "solve your own problem" approach to find your niche',
    'Build a simple landing page before writing any code to validate demand',
    'Use Twitter/X as primary distribution channel for early traction'
  ],
  array[
    'Write down 3 problems you face daily that you''d pay to solve',
    'Set up a simple landing page with Carrd or Framer this weekend',
    'Join the Indie Hackers forum and post your idea for feedback'
  ],
  true
),
(
  '5-minute morning routine that changed my productivity',
  'https://www.instagram.com/reel/example2/',
  'productivity',
  'unread',
  array['morning','routine','focus','habits'],
  'A minimalist 5-step morning routine focusing on hydration, movement, journaling, priority setting, and no-phone first 30 minutes.',
  array[
    'Stack this with your existing alarm habit for zero friction adoption',
    'Use the priority-setting step to define your one most important task',
    'Track consistency with a simple habit tracker app'
  ],
  array[
    'Try the routine for just 3 days — no more commitment than that',
    'Lay out your journal tonight so it''s ready in the morning',
    'Set your phone to grayscale mode to reduce morning screen pull'
  ],
  false
);

-- ============================================================
-- Done! Your ReelMind database is ready.
-- ============================================================
