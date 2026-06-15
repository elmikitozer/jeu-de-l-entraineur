-- 008_motm_sources.sql
-- Sépare le MOTM en deux sources tracées, conservées EN PARALLÈLE :
--   motm_proxy    : meilleur joueur selon le rating algorithmique API-Football
--   motm_official : Player of the Match OFFICIEL FIFA (récupéré via l'API FIFA+)
--
-- La colonne motm existante devient le MOTM « effectif » porteur du bonus +3 :
--   = officiel si disponible pour le match, sinon fallback sur le proxy.
-- On garde les deux sources pour tracer les écarts et juger la fiabilité du proxy.

alter table public.player_stats
  add column if not exists motm_proxy    boolean not null default false,
  add column if not exists motm_official boolean not null default false;

-- Historique : jusqu'ici la colonne motm contenait le proxy rating.
-- On recopie cette valeur dans motm_proxy pour ne pas perdre la trace.
update public.player_stats set motm_proxy = true where motm = true;
