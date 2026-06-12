// ── Factory centralisée des clients Supabase (server-side) ────────────────────
//
// Source unique pour la construction des clients. Évite la duplication du bloc
// createClient(URL, KEY) qui était répété dans 7 fichiers (routes admin/cron,
// search, queries, sync-engine, sync-retroactive).
//
// IMPORTANT — pas de generic <Database> : l'inférence TS générique provoquait
// des erreurs de typage (raison de l'abandon de l'ancien lib/supabase.ts).
// On assume un client non typé, pattern projet.
//
// La clé est lue à l'appel (lazy) et jamais au chargement du module, pour rester
// fidèle au comportement d'origine.

import { createClient } from '@supabase/supabase-js'

/**
 * Client service-role : contourne RLS. Server-side UNIQUEMENT (routes admin,
 * cron, libs de sync). Ne jamais exposer cette clé côté client.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Client anon : clé publique, soumis aux policies RLS SELECT publiques.
 * Pour les endpoints publics non authentifiés (jamais le service_role).
 */
export function createAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Client server-side avec fallback : service-role si disponible, sinon anon.
 * Utilisé par les Server Components (lib/queries) où la service-role est
 * préférée pour contourner d'éventuels soucis RLS, l'anon suffisant en lecture.
 */
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
