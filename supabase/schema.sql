-- StellarBurst Supabase MVP schema
-- Run this file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'waiting'
    check (status in ('waiting', 'playing', 'finished')),
  host_client_id text,
  seed text not null default gen_random_uuid()::text,
  current_turn_player_id uuid,
  winner_player_id uuid,
  state jsonb not null default '{}'::jsonb,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  client_id text not null,
  name text not null,
  hp integer not null default 100,
  hand jsonb not null default '[]'::jsonb,
  status text not null default 'alive'
    check (status in ('alive', 'defeated')),
  is_ready boolean not null default false,
  is_cpu boolean not null default false,
  effects jsonb not null default '{}'::jsonb,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, client_id)
);

create table if not exists public.game_events (
  id bigserial primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_rooms_code on public.rooms(code);
create index if not exists idx_players_room_id on public.players(room_id);
create index if not exists idx_game_events_room_id_created_at
  on public.game_events(room_id, created_at);

-- updated_at trigger

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_rooms_updated_at on public.rooms;
create trigger set_rooms_updated_at
before update on public.rooms
for each row
execute function public.set_updated_at();

drop trigger if exists set_players_updated_at on public.players;
create trigger set_players_updated_at
before update on public.players
for each row
execute function public.set_updated_at();

-- MVP permissions
-- Development only.
-- This is acceptable for a friend-testing MVP, but must be tightened before public release.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.rooms to anon, authenticated;
grant select, insert, update, delete on public.players to anon, authenticated;
grant select, insert on public.game_events to anon, authenticated;
grant usage, select on sequence public.game_events_id_seq to anon, authenticated;

alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.game_events enable row level security;

drop policy if exists "dev rooms select" on public.rooms;
create policy "dev rooms select"
on public.rooms for select
to anon, authenticated
using (true);

drop policy if exists "dev rooms insert" on public.rooms;
create policy "dev rooms insert"
on public.rooms for insert
to anon, authenticated
with check (true);

drop policy if exists "dev rooms update" on public.rooms;
create policy "dev rooms update"
on public.rooms for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "dev rooms delete" on public.rooms;
create policy "dev rooms delete"
on public.rooms for delete
to anon, authenticated
using (true);

drop policy if exists "dev players select" on public.players;
create policy "dev players select"
on public.players for select
to anon, authenticated
using (true);

drop policy if exists "dev players insert" on public.players;
create policy "dev players insert"
on public.players for insert
to anon, authenticated
with check (true);

drop policy if exists "dev players update" on public.players;
create policy "dev players update"
on public.players for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "dev players delete" on public.players;
create policy "dev players delete"
on public.players for delete
to anon, authenticated
using (true);

drop policy if exists "dev events select" on public.game_events;
create policy "dev events select"
on public.game_events for select
to anon, authenticated
using (true);

drop policy if exists "dev events insert" on public.game_events;
create policy "dev events insert"
on public.game_events for insert
to anon, authenticated
with check (true);

-- Enable Supabase Realtime publication.
-- This block safely skips tables already added to the publication.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'players'
  ) then
    alter publication supabase_realtime add table public.players;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_events'
  ) then
    alter publication supabase_realtime add table public.game_events;
  end if;
end $$;
