'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import type { Match } from '@/lib/types'
import { TEAM_NAME_FR, getCountryCode } from '@/lib/flags'
import { parseMatchDateUTC } from '@/lib/datetime'
import Flag from '@/components/Flag'
import LocalTime from '@/components/LocalTime'

interface Props {
  match: Match
}

/** "Phase de groupes - Groupe A" → "PHASE DE GROUPES · GROUPE A" */
function formatStage(stage: string | null): string | null {
  if (!stage) return null
  return stage.replace(/\s*[-–]\s*/g, ' · ').toUpperCase()
}

/** "Estadio Azteca, Mexico City" → { venue, city } */
function splitVenue(venue: string | null): { venue: string; city: string | null } {
  if (!venue) return { venue: '', city: null }
  const i = venue.lastIndexOf(',')
  if (i === -1) return { venue, city: null }
  return { venue: venue.slice(0, i).trim(), city: venue.slice(i + 1).trim() }
}

function Countdown({ date }: { date: string }) {
  const target = parseMatchDateUTC(date).getTime()
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (now === null) return null // évite tout mismatch d'hydratation
  const diff = Math.max(0, target - now)
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff % 86_400_000) / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1000)

  const cells: { v: number; l: string }[] = [
    ...(d > 0 ? [{ v: d, l: 'J' }] : []),
    { v: h, l: 'H' },
    { v: m, l: 'MIN' },
    { v: s, l: 'SEC' },
  ]

  return (
    <div className="flex items-end gap-3 justify-center" suppressHydrationWarning>
      {cells.map((c, i) => (
        <div key={i} className="flex flex-col items-center">
          <span className="font-display font-bold italic text-[34px] md:text-[42px] leading-none text-white tabular-nums">
            {String(c.v).padStart(2, '0')}
          </span>
          <span className="text-[10px] font-bold font-body tracking-[0.14em] text-sub mt-1">{c.l}</span>
        </div>
      ))}
    </div>
  )
}

function TeamBlock({ team, align, matchId }: { team: string; align: 'left' | 'right'; matchId: string }) {
  const code = getCountryCode(team)
  const inner = (
    <>
      <Flag teamName={team} size="40x30" className="!w-[68px] !h-[48px] shadow-lg" />
      <span className="font-display font-bold italic uppercase text-[26px] md:text-[40px] leading-[0.95] text-white text-center md:text-inherit break-words group-hover:text-[color:var(--c-lime)] transition-colors">
        {TEAM_NAME_FR[team] ?? team}
      </span>
    </>
  )
  const cls = `group flex flex-col items-center gap-3 flex-1 min-w-0 ${
    align === 'left' ? 'md:items-end' : 'md:items-start'
  }`

  // Pas de code (ex: "TBD") → bloc non cliquable
  if (!code) return <div className={cls}>{inner}</div>
  return (
    <Link href={`/teams/${code}?from=/matches/${matchId}`} className={cls}>
      {inner}
    </Link>
  )
}

export default function MatchHero({ match }: Props) {
  const reduced = useReducedMotion()
  const stage = formatStage(match.stage)
  const { venue, city } = splitVenue(match.venue)
  const isFinished = match.status === 'finished'
  const isLive = match.status === 'live'
  const hasScore = match.home_score !== null && match.away_score !== null

  const spring = reduced
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 260, damping: 22 }

  return (
    <div
      className="relative overflow-hidden rounded-3xl px-5 md:px-10 py-8 md:py-10"
      style={{
        background: 'var(--c-card-overlay)',
        border: '1px solid var(--c-card-border)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0 12px 40px rgba(0,30,18,0.35)',
      }}
    >
      {/* Eyebrow : statut + phase */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 mb-7">
        {isLive && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold font-body tracking-[0.14em] uppercase text-white">
            <span className="relative inline-flex h-2.5 w-2.5">
              {!reduced && (
                <span
                  className="absolute inline-flex h-full w-full rounded-full opacity-70"
                  style={{ background: 'var(--c-lime)', animation: 'pulse-ring 1.4s ease-out infinite' }}
                />
              )}
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: 'var(--c-lime)' }} />
            </span>
            En cours
          </span>
        )}
        {isFinished && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold font-body tracking-[0.14em] uppercase text-green">
            <span className="w-1.5 h-1.5 rounded-full bg-green" />
            Terminé
          </span>
        )}
        {stage && (
          <span className="text-[11px] font-bold font-body tracking-[0.14em] uppercase" style={{ color: 'var(--c-lime)' }}>
            {stage}
          </span>
        )}
      </div>

      {/* Équipes + score */}
      <div className="flex items-center justify-between gap-3 md:gap-6">
        <TeamBlock team={match.home_team} align="left" matchId={match.id} />

        <div className="flex flex-col items-center flex-shrink-0 px-1 md:px-4">
          {hasScore ? (
            <motion.div
              initial={reduced ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={spring}
              className="font-display font-bold italic text-[58px] md:text-[92px] leading-none text-white tabular-nums whitespace-nowrap"
            >
              {match.home_score}<span className="text-sub mx-1 md:mx-2">–</span>{match.away_score}
            </motion.div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <span className="font-display font-bold italic text-[34px] md:text-[44px] leading-none" style={{ color: 'var(--c-lime)' }}>
                À venir
              </span>
              <span className="text-[12px] font-body text-sub">
                <LocalTime date={match.date} mode="date" /> · <LocalTime date={match.date} />
              </span>
            </div>
          )}
        </div>

        <TeamBlock team={match.away_team} align="right" matchId={match.id} />
      </div>

      {/* Countdown pour les matchs à venir */}
      {match.status === 'scheduled' && (
        <div className="mt-8">
          <Countdown date={match.date} />
        </div>
      )}

      {/* Stade + ville */}
      {(venue || city) && (
        <div className="mt-8 pt-5 border-t border-line flex flex-col items-center gap-0.5 text-center">
          <span className="text-[13px] font-semibold font-body text-ink">{venue}</span>
          {city && <span className="text-[12px] font-body text-sub">{city}</span>}
        </div>
      )}
    </div>
  )
}
