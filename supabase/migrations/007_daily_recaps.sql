-- 007_daily_recaps.sql
-- Chronique du jour générée par IA (claude-sonnet-4-6), une par journée de matchs.
-- Stockée pour éviter toute régénération (immuable, une ligne par date).

create table if not exists public.daily_recaps (
  recap_date date primary key,
  content    text not null,
  created_at timestamptz default now()
);

-- RLS : lecture publique (mirror 004). Écriture via service_role (cron) qui bypasse RLS.
alter table public.daily_recaps enable row level security;
drop policy if exists "public_read" on public.daily_recaps;
create policy "public_read" on public.daily_recaps for select to anon, authenticated using (true);
