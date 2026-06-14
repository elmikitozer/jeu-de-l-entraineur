'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { FIFA_CODE } from '@/lib/flags'

/**
 * Barre de score sticky (mobile) affichée pendant les matchs live, sous la
 * navbar — garde le score sous les yeux quand on scrolle. Auto-suffisante :
 * fetch + souscription Realtime sur `matches` + fallback polling 60s, donc live
 * sur toutes les pages (indépendante du RealtimeRefresh par page).
 *
 * Pas de minute affichée : le schéma ne stocke pas le temps de jeu et la dériver
 * du coup d'envoi serait faux (mi-temps, arrêts de jeu). La pastille rouge
 * pulsante porte le signal "en direct".
 */
type LiveRow = {
  id: string
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  minute: number | null
  status_short: string | null
}

/** "67'" en jeu, "MT" à la mi-temps, rien sinon. */
function liveClock(m: LiveRow): string | null {
  if (m.status_short === 'HT') return 'MT'
  if (m.minute != null) return `${m.minute}'`
  return null
}

function code(team: string): string {
  return FIFA_CODE[team] ?? team.slice(0, 3).toUpperCase()
}

export default function LiveScoreBar() {
  const [live, setLive] = useState<LiveRow[]>([])

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    let cancelled = false

    async function load() {
      const { data } = await supabase
        .from('matches')
        .select('id, home_team, away_team, home_score, away_score, minute, status_short')
        .eq('status', 'live')
        .order('date', { ascending: true })
      if (!cancelled) setLive((data ?? []) as unknown as LiveRow[])
    }

    load()
    const channel = supabase
      .channel('je-livebar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => load())
      .subscribe()
    const poll = setInterval(load, 60_000)

    return () => {
      cancelled = true
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [])

  if (live.length === 0) return null

  return (
    <div
      className="md:hidden"
      style={{
        background: 'rgba(239, 68, 68, 0.12)',
        borderBottom: '1px solid rgba(239, 68, 68, 0.30)',
      }}
    >
      <div className="flex gap-4 overflow-x-auto px-4 py-2 no-scrollbar">
        {live.map((m) => (
          <Link
            key={m.id}
            href={`/matches/${m.id}`}
            className="flex items-center gap-2 whitespace-nowrap flex-shrink-0"
          >
            <span className="relative inline-flex w-2 h-2 flex-shrink-0">
              <span
                className="absolute inset-0 rounded-full"
                style={{ background: 'rgba(239,68,68,0.5)', animation: 'pulse-ring 1.5s ease-out infinite' }}
              />
              <span className="absolute inset-0 rounded-full" style={{ background: '#EF4444' }} />
            </span>
            <span className="text-[13px] font-body font-semibold text-white">
              {code(m.home_team)}{' '}
              <span className="font-display font-bold italic tabular-nums">
                {m.home_score ?? 0}–{m.away_score ?? 0}
              </span>{' '}
              {code(m.away_team)}
            </span>
            {liveClock(m) && (
              <span className="text-[11px] font-body font-bold tabular-nums" style={{ color: 'var(--c-lime)' }}>
                {liveClock(m)}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
