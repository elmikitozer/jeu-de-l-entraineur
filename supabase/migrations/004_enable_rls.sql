-- 004_enable_rls.sql
-- =============================================================================
-- FIX SÉCURITÉ CRITIQUE : active Row Level Security sur toutes les tables.
--
-- Contexte : RLS était DÉSACTIVÉ. Comme la clé anon est publique (embarquée dans
-- le bundle client via RealtimeRefresh), et que Supabase accorde par défaut les
-- droits d'écriture au rôle `anon`, n'importe quel visiteur pouvait modifier le
-- classement, supprimer des participants, falsifier les points.
--
-- Modèle après ce fix :
--   - anon / authenticated : LECTURE SEULE (SELECT) sur toutes les tables.
--     → nécessaire pour le site public ET pour Supabase Realtime (postgres_changes
--       respecte la policy SELECT du rôle abonné).
--   - AUCUNE policy INSERT/UPDATE/DELETE → l'écriture anonyme est refusée.
--   - Les Route Handlers (cron, admin, sync) utilisent le service_role, qui
--     BYPASSE RLS → ils continuent d'écrire normalement.
--
-- Idempotent : ré-exécutable sans erreur (DROP POLICY IF EXISTS avant CREATE).
-- À exécuter dans le SQL Editor Supabase.
-- =============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'participants', 'players', 'teams', 'matches', 'player_stats', 'points_log'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "public_read" on public.%I;', t);
    execute format(
      'create policy "public_read" on public.%I for select to anon, authenticated using (true);',
      t
    );
  end loop;
end $$;

-- Vérification :
--   select tablename, rowsecurity from pg_tables where schemaname = 'public';
--   select tablename, policyname, cmd, roles from pg_policies where schemaname = 'public';
