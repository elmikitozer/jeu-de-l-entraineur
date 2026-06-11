'use client'

import { motion, useAnimation, useReducedMotion } from 'framer-motion'
import type { Match } from '@/lib/types'
import { TEAM_NAME_FR, FIFA_CODE } from '@/lib/flags'
import Flag from '@/components/Flag'
import LocalTime from '@/components/LocalTime'

interface Props {
  match: Match
  index: number
}

export default function MatchCard({ match }: Props) {
  const reduced = useReducedMotion()

  const homeFlagCtrl = useAnimation()
  const awayFlagCtrl = useAnimation()

  const handleHoverStart = () => {
    if (reduced) return
    homeFlagCtrl.start({ scale: [1, 1.15, 1], transition: { duration: 0.5, ease: 'easeInOut' } })
    awayFlagCtrl.start({ scale: [1, 1.15, 1], transition: { duration: 0.5, ease: 'easeInOut', delay: 0.06 } })
  }

  return (
    <motion.div
      className="flex-1 min-w-0 flex flex-col gap-2.5 cursor-pointer"
      style={{
        background: 'rgba(4, 26, 17, 0.55)',
        border: '1px solid var(--c-card-border)',
        borderRadius: 14,
        padding: '13px 15px',
        color: '#ffffff',
      }}
      whileHover={
        reduced
          ? {}
          : {
              y: -4,
              boxShadow: '0 0 0 1px rgba(200,245,66,0.40)',
            }
      }
      onHoverStart={handleHoverStart}
      transition={{
        y: { type: 'spring', stiffness: 300, damping: 25 },
        boxShadow: { duration: 0.2 },
      }}
    >
      {/* Ligne 1 : phase + date */}
      <div className="flex justify-between text-[11px]" style={{ opacity: 0.85 }}>
        <span className="font-bold tracking-[0.1em] uppercase font-body">
          {match.stage ?? 'Groupe'}
        </span>
        <LocalTime date={match.date} mode="date" className="font-body" />
      </div>

      {/* Ligne 2 : équipes + heure */}
      <div className="flex items-center justify-center gap-2.5">
        <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0">
          <span className="block md:hidden font-display font-bold italic text-[20px] text-right truncate">
            {TEAM_NAME_FR[match.home_team] ?? match.home_team}
          </span>
          <span
            className="hidden md:block font-display font-bold italic text-[22px]"
            title={TEAM_NAME_FR[match.home_team] ?? match.home_team}
          >
            {FIFA_CODE[match.home_team] ?? match.home_team.slice(0, 3).toUpperCase()}
          </span>
          <motion.span animate={homeFlagCtrl} style={{ display: 'inline-flex' }}>
            <Flag teamName={match.home_team} size="24x18" />
          </motion.span>
        </div>

        {/* Heure */}
        <span
          className="font-body font-bold whitespace-nowrap flex-shrink-0 text-[12px]"
          style={{
            background: 'var(--c-lime)',
            color: '#07261B',
            borderRadius: 999,
            padding: '2px 9px',
          }}
        >
          <LocalTime date={match.date} />
        </span>

        <div className="flex items-center justify-start gap-1.5 flex-1 min-w-0">
          <motion.span animate={awayFlagCtrl} style={{ display: 'inline-flex' }}>
            <Flag teamName={match.away_team} size="24x18" />
          </motion.span>
          <span className="block md:hidden font-display font-bold italic text-[20px] text-left truncate">
            {TEAM_NAME_FR[match.away_team] ?? match.away_team}
          </span>
          <span
            className="hidden md:block font-display font-bold italic text-[22px]"
            title={TEAM_NAME_FR[match.away_team] ?? match.away_team}
          >
            {FIFA_CODE[match.away_team] ?? match.away_team.slice(0, 3).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Stade */}
      {match.venue && (
        <div
          className="text-[10.5px] text-center font-body line-clamp-2 break-words"
          style={{ opacity: 0.7 }}
          title={match.venue}
        >
          {match.venue}
        </div>
      )}
    </motion.div>
  )
}
