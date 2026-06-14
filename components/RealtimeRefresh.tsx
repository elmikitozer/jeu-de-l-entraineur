'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

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

    const doRefresh = () => router.refresh()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onChange = (payload: any) => {
      // Transmet le matchId si la mise à jour concerne la table matches
      const matchId: string | undefined =
        payload?.table === 'matches' && typeof payload?.new?.id === 'string'
          ? payload.new.id
          : undefined
      window.dispatchEvent(new CustomEvent('je:realtime', { detail: { matchId } }))
      // Debounce : une rafale d'events (but + passe + carton) = 1 seul refetch
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(doRefresh, 2000)
    }

    const channel = supabase.channel('je-public-live')
    for (const table of tables) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
    }
    channel.subscribe()

    // Fallback polling si Realtime se déconnecte
    const pollId = setInterval(doRefresh, 60_000)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      clearInterval(pollId)
      supabase.removeChannel(channel)
    }
  }, [router, tables])

  return null
}
