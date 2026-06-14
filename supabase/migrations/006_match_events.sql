-- 006_match_events.sql
-- Événements de match horodatés (minute) pour une vraie timeline chronologique.
-- Remplace la dérivation depuis player_stats agrégés (qui perdait minute + ordre).
-- Source : événements API-Football (event.time.elapsed/extra) déjà dans le payload
-- fixture → 0 appel API supplémentaire. Stocke TOUS les buteurs/cartons (pas
-- seulement le pool fantasy) ; player_id null si le joueur n'est pas dans notre base.

create table if not exists public.match_events (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.matches(id) on delete cascade,
  player_id   uuid references public.players(id) on delete set null,
  player_name text not null,
  type        text not null,   -- goal | freekick | penalty | assist | yellow | red
  side        text,            -- home | away
  minute      int,
  extra       int,
  created_at  timestamptz default now()
);

create index if not exists match_events_match_id_idx on public.match_events (match_id);

-- RLS : lecture publique seule (mirror 004). Les écritures passent par le
-- service_role (sync) qui bypasse RLS.
alter table public.match_events enable row level security;
drop policy if exists "public_read" on public.match_events;
create policy "public_read" on public.match_events for select to anon, authenticated using (true);
