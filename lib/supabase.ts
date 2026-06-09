/**
 * supabase.ts — Clients Supabase pour usage browser (client) et serveur (Server Components / Route Handlers).
 * Utilise @supabase/ssr pour la gestion correcte des cookies Next.js App Router.
 */

import { createBrowserClient } from '@supabase/ssr'
import { createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Typage générique de la base — à remplacer par le type généré via `supabase gen types`
// ---------------------------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      participants: {
        Row: import('./types').Participant
        Insert: Omit<import('./types').Participant, 'id' | 'created_at' | 'total_points'>
        Update: Partial<import('./types').Participant>
      }
      players: {
        Row: import('./types').Player
        Insert: Omit<import('./types').Player, 'id'>
        Update: Partial<import('./types').Player>
      }
      teams: {
        Row: import('./types').Team
        Insert: Omit<import('./types').Team, 'id'>
        Update: Partial<import('./types').Team>
      }
      matches: {
        Row: import('./types').Match
        Insert: Omit<import('./types').Match, 'id'>
        Update: Partial<import('./types').Match>
      }
      player_stats: {
        Row: import('./types').PlayerStats
        Insert: Omit<import('./types').PlayerStats, 'id'>
        Update: Partial<import('./types').PlayerStats>
      }
      points_log: {
        Row: import('./types').PointsLog
        Insert: Omit<import('./types').PointsLog, 'id' | 'created_at'>
        Update: Partial<import('./types').PointsLog>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// ---------------------------------------------------------------------------
// Client browser (à utiliser dans les Client Components)
// ---------------------------------------------------------------------------

export function createClient(): SupabaseClient<Database> {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ---------------------------------------------------------------------------
// Client serveur (à utiliser dans les Server Components et Route Handlers)
// Gère automatiquement les cookies pour la session — pas d'auth utilisateur ici,
// mais nécessaire pour les appels depuis les Route Handlers admin (service role).
// ---------------------------------------------------------------------------

export async function createServerClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies()

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

// ---------------------------------------------------------------------------
// Client admin avec service role (uniquement pour les Route Handlers admin)
// Ne jamais exposer côté client.
// ---------------------------------------------------------------------------

export async function createAdminClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies()

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}
