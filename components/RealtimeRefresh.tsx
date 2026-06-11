'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

/**
 * Souscrit à Supabase Realtime sur les tables mises à jour par le moteur de sync.
 * À chaque changement, rafraîchit les Server Components (router.refresh, debounced)
 * et émet un CustomEvent('je:realtime') que l'indicateur "Mis à jour" écoute pour
 * se remettre à zéro.
 *
 * Prérequis : tables ajoutées à la publication supabase_realtime
 * (voir supabase/migrations/002_enable_realtime.sql).
 */
export default function RealtimeRefresh({
  tables = ['points_log', 'player_stats', 'matches'],
}: {
  tables?: string[]
}) {
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const onChange = () => {
      // Signale immédiatement l'event (reset de l'indicateur) sans attendre le refetch
      window.dispatchEvent(new CustomEvent('je:realtime'))
      // Debounce le refresh : une rafale d'events (but + passe + carton) = 1 seul refetch
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => router.refresh(), 600)
    }

    const channel = supabase.channel('je-public-live')
    for (const table of tables) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        onChange
      )
    }
    channel.subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [router, tables])

  return null
}
