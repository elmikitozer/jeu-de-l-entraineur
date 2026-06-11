-- 002_enable_realtime.sql
-- Active Supabase Realtime sur les tables mises à jour par le moteur de sync.
-- Sans ça, les websockets ne reçoivent aucun événement postgres_changes.
--
-- À exécuter dans l'éditeur SQL Supabase (Dashboard → SQL Editor) une seule fois.
-- Les tables sont déjà lisibles par le rôle anon (RLS permissif), donc Realtime
-- (qui respecte la RLS) délivrera bien les events au client public.

-- Ajoute les tables à la publication Realtime (idempotent : ignore si déjà présentes)
do $$
begin
  begin
    alter publication supabase_realtime add table public.player_stats;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.points_log;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.matches;
  exception when duplicate_object then null;
  end;
end $$;

-- Assure que les UPDATE/DELETE transmettent bien la ligne complète (pour les payloads)
alter table public.player_stats replica identity full;
alter table public.points_log  replica identity full;
alter table public.matches     replica identity full;
