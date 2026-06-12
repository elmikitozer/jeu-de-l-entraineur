-- 003_pg_cron_sync.sql
-- Scheduler FIABLE pour le sync live, exécuté DANS Supabase (pg_cron + pg_net).
--
-- Pourquoi : GitHub Actions n'honore pas les crons haute fréquence (un cron
-- "* * * * *" n'y tourne en réalité que toutes les 1-2h, de façon sporadique),
-- ce qui rend le vrai temps réel impossible. pg_cron tourne chaque minute de
-- façon fiable, et pg_net appelle le endpoint Vercel en HTTP.
--
-- ⚠️ À exécuter dans le SQL Editor Supabase. Remplace les 2 placeholders avant
-- d'exécuter (NE COMMITE PAS la version avec le vrai secret).
--   <TON_CRON_SECRET>  → la valeur de CRON_SECRET (identique à Vercel)
--   l'URL si ton domaine de prod diffère

-- 1) Extensions (à activer une seule fois)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2) Supprime un éventuel job précédent du même nom (ré-exécution idempotente)
select cron.unschedule('sync-stats-every-min')
where exists (select 1 from cron.job where jobname = 'sync-stats-every-min');

-- 3) Planifie l'appel du endpoint chaque minute
select cron.schedule(
  'sync-stats-every-min',
  '* * * * *',
  $$
  select net.http_get(
    url     := 'https://jeu-de-l-entraineur.vercel.app/api/cron/sync-stats',
    headers := jsonb_build_object('Authorization', 'Bearer ' || '<TON_CRON_SECRET>'),
    timeout_milliseconds := 30000
  );
  $$
);

-- Vérifier : select * from cron.job;
-- Historique : select * from cron.job_run_details order by start_time desc limit 20;
-- Désactiver : select cron.unschedule('sync-stats-every-min');
