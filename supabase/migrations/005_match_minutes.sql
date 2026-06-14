-- 005_match_minutes.sql
-- Minute de jeu : chrono live des matchs + minutes jouées par joueur.
-- Sources API-Football déjà récupérées à chaque cycle (fixture.status.elapsed,
-- games.minutes) → aucun appel API supplémentaire. Additif et idempotent.

alter table public.matches      add column if not exists minute int;
alter table public.matches      add column if not exists status_short text;
alter table public.player_stats add column if not exists minutes int;
