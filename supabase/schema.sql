-- Ba Zi App database schema.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

-- One row per saved chart. The birth details live in "input" (JSON); the
-- chart itself is recomputed from them by the verified engine on load.
create table public.saved_charts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  chart_name text not null,
  input jsonb not null
);

-- Row level security: each user can only ever see or touch their own rows.
-- This is enforced by the database itself, not by the app's code.
alter table public.saved_charts enable row level security;

create policy "Users can view their own charts"
  on public.saved_charts for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own charts"
  on public.saved_charts for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own charts"
  on public.saved_charts for delete
  using ((select auth.uid()) = user_id);
