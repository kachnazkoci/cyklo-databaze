-- Spusť v Supabase: SQL Editor > New query > vložit > Run.
create table if not exists public.cycling_state (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.cycling_state enable row level security;
drop policy if exists "Users can read own cycling state" on public.cycling_state;
drop policy if exists "Users can insert own cycling state" on public.cycling_state;
drop policy if exists "Users can update own cycling state" on public.cycling_state;
create policy "Users can read own cycling state" on public.cycling_state for select to authenticated using (auth.uid() = owner_id);
create policy "Users can insert own cycling state" on public.cycling_state for insert to authenticated with check (auth.uid() = owner_id);
create policy "Users can update own cycling state" on public.cycling_state for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
