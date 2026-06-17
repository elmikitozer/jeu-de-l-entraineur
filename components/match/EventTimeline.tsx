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
    // crampon / botte de foot (profil)
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 7 L8 7 C12 7 16 9 18 14 L19 15 C19.6 15.6 19.2 16.6 18.3 16.6 L5 16.6 C4.3 16.6 4 16.2 4 15.5 Z"
          fill="var(--c-blue)"
        />
        <g fill="var(--c-blue)">
          <rect x="6.4" y="16.9" width="1.7" height="2.3" rx="0.6" />
          <rect x="10.4" y="16.9" width="1.7" height="2.3" rx="0.6" />
          <rect x="14.4" y="16.9" width="1.7" height="2.3" rx="0.6" />
        </g>
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
  // but : ballon dans les filets (goal / freekick / penalty)
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      {/* filet (mailles en losange, discret) */}
      <g stroke="#ffffff" strokeWidth="0.8" opacity="0.4" strokeLinecap="round">
        <path d="M8 0L24 16 M0 0L24 24 M0 8L16 24 M16 0L0 16 M24 0L0 24 M24 8L8 24" />
      </g>
      {/* ballon */}
      <circle cx="12" cy="12" r="6.2" fill="#ffffff" stroke="#0D4A30" strokeWidth="1.1" />
      <polygon points="12,8.8 14.7,10.7 13.7,13.9 10.3,13.9 9.3,10.7" fill="#0D4A30" />
      <g stroke="#0D4A30" strokeWidth="0.9" strokeLinecap="round">
        <path d="M12 8.8L12 6 M14.7 10.7L17.2 9.6 M13.7 13.9L15.3 16 M10.3 13.9L8.7 16 M9.3 10.7L6.8 9.6" />
      </g>
    </svg>
  )
}

function EventNode({ event }: { event: MatchEvent }) {
  const meta = META[event.type]
  const isHome = event.side === 'home'

  const minuteLabel = event.minute != null ? `${event.minute}${event.extra ? `+${event.extra}` : ''}'` : null
  const nameInner = (
    <>
      {event.playerName}
      {event.count > 1 && <span className="text-sub"> ×{event.count}</span>}
    </>
  )
  // Tailles réduites sur mobile pour tenir en 3 colonnes dès 390px.
  const nameCls = 'font-display font-bold italic text-[13px] md:text-[19px] text-white leading-tight break-words'

  // Alignement appliqué à TOUTES les tailles (home → droite, away → gauche),
  // pour une structure identique mobile et desktop.
  const content = (
    <div className={`flex flex-col min-w-0 ${isHome ? 'items-end text-right' : 'items-start text-left'}`}>
      {event.playerId ? (
        <Link href={`/players/${event.playerId}`} className={`${nameCls} hover:opacity-75 transition-opacity`}>
          {nameInner}
        </Link>
      ) : (
        <span className={nameCls}>{nameInner}</span>
      )}
      <span className="text-[10px] md:text-[11px] font-bold font-body tracking-[0.06em] md:tracking-[0.08em] uppercase leading-tight" style={{ color: meta.color }}>
        {minuteLabel && <span className="text-white">{minuteLabel} · </span>}
        {meta.label}
      </span>
    </div>
  )

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 md:gap-5">
      {/* Colonne gauche (home) — vide si événement away */}
      <div className="min-w-0">{isHome ? content : null}</div>

      {/* Noeud central */}
      <div
        className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full flex-shrink-0 z-10"
        style={{ background: 'var(--c-card)', border: `1.5px solid ${meta.color}` }}
      >
        <EventIcon type={event.type} />
      </div>

      {/* Colonne droite (away) — vide si événement home */}
      <div className="min-w-0">{!isHome ? content : null}</div>
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
