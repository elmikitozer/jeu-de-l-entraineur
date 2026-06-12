'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import type { MatchEvent } from '@/lib/queries'
import { TEAM_NAME_FR, FIFA_CODE } from '@/lib/flags'
import Flag from '@/components/Flag'

interface Props {
  events: MatchEvent[]
  homeTeam: string
  awayTeam: string
}

const META: Record<MatchEvent['type'], { label: string; color: string }> = {
  goal: { label: 'But', color: 'var(--c-lime)' },
  freekick: { label: 'But · coup franc', color: 'var(--c-lime)' },
  penalty: { label: 'But · penalty', color: 'var(--c-lime)' },
  assist: { label: 'Passe décisive', color: 'var(--c-blue)' },
  yellow: { label: 'Carton jaune', color: '#FACC15' },
  red: { label: 'Carton rouge', color: 'var(--c-red)' },
  penalty_saved: { label: 'Penalty arrêté', color: 'var(--c-blue)' },
}

function EventIcon({ type }: { type: MatchEvent['type'] }) {
  if (type === 'yellow' || type === 'red') {
    return (
      <span
        className="block w-3 h-[18px] rounded-[2px]"
        style={{ background: type === 'yellow' ? '#FACC15' : 'var(--c-red)' }}
      />
    )
  }
  if (type === 'assist') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--c-blue)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    )
  }
  if (type === 'penalty_saved') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--c-blue)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    )
  }
  // ballon (goal / freekick / penalty)
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#07261B" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" fill="#ffffff" />
      <path d="m12 7 2.6 1.9-1 3.1h-3.2l-1-3.1L12 7Z" fill="#0D4A30" stroke="none" />
      <path d="M12 7V4M14.6 8.9l2.6-1M13.6 12l1 3M10.4 12l-1 3M9.4 8.9l-2.6-1" stroke="#0D4A30" strokeWidth="1.2" />
    </svg>
  )
}

function EventNode({ event }: { event: MatchEvent }) {
  const meta = META[event.type]
  const isHome = event.side === 'home'

  const content = (
    <div className={`flex flex-col ${isHome ? 'md:items-end md:text-right' : 'md:items-start md:text-left'}`}>
      <Link
        href={`/players/${event.playerId}`}
        className="font-display font-bold italic text-[17px] md:text-[19px] text-white hover:opacity-75 transition-opacity leading-tight"
      >
        {event.playerName}
        {event.count > 1 && <span className="text-sub"> ×{event.count}</span>}
      </Link>
      <span className="text-[11px] font-bold font-body tracking-[0.08em] uppercase" style={{ color: meta.color }}>
        {meta.label}
      </span>
    </div>
  )

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-5">
      {/* Colonne gauche (home) */}
      <div className={isHome ? '' : 'hidden md:block'}>{isHome ? content : null}</div>

      {/* Noeud central */}
      <div
        className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 z-10"
        style={{ background: 'var(--c-card)', border: `1.5px solid ${meta.color}` }}
      >
        <EventIcon type={event.type} />
      </div>

      {/* Colonne droite (away) */}
      <div className={!isHome ? '' : 'hidden md:block'}>{!isHome ? content : null}</div>
    </div>
  )
}

export default function EventTimeline({ events, homeTeam, awayTeam }: Props) {
  const reduced = useReducedMotion()

  if (events.length === 0) {
    return (
      <p className="text-center py-8 text-[13px] font-body text-sub">
        Aucun fait marquant enregistré pour ce match.
      </p>
    )
  }

  return (
    <div className="relative">
      {/* En-tête équipes (home gauche / away droite) */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-5">
        <div className="flex items-center gap-2 justify-start md:justify-end">
          <Flag teamName={homeTeam} size="24x18" />
          <span className="hidden sm:inline font-display font-bold italic text-[15px] text-white truncate">
            {TEAM_NAME_FR[homeTeam] ?? homeTeam}
          </span>
          <span className="sm:hidden font-display font-bold italic text-[15px] text-white">
            {FIFA_CODE[homeTeam] ?? homeTeam.slice(0, 3).toUpperCase()}
          </span>
        </div>
        <div className="w-9" aria-hidden />
        <div className="flex items-center gap-2 justify-end md:justify-start flex-row-reverse md:flex-row">
          <Flag teamName={awayTeam} size="24x18" />
          <span className="hidden sm:inline font-display font-bold italic text-[15px] text-white truncate">
            {TEAM_NAME_FR[awayTeam] ?? awayTeam}
          </span>
          <span className="sm:hidden font-display font-bold italic text-[15px] text-white">
            {FIFA_CODE[awayTeam] ?? awayTeam.slice(0, 3).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Ligne verticale centrale */}
      <div
        className="absolute top-14 bottom-8 left-1/2 -translate-x-1/2 w-px"
        style={{ background: 'var(--c-line)' }}
        aria-hidden
      />

      <div className="flex flex-col gap-4">
        {events.map((e, i) => (
          <motion.div
            key={`${e.type}-${e.playerId}-${i}`}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={reduced ? { duration: 0 } : { duration: 0.35, delay: i * 0.06, ease: 'easeOut' }}
          >
            <EventNode event={e} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
