'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { LeaderboardEntry } from '@/lib/queries'
import Avatar from './Avatar'
import OdometerScore from './OdometerScore'

interface Props {
  entry: LeaderboardEntry
  place: 1 | 2 | 3
}

const SPRING = { type: 'spring', stiffness: 260, damping: 22 } as const

const CARD_DELAY: Record<1 | 2 | 3, number> = { 1: 0.12, 2: 0.20, 3: 0.28 }

function ArrowBadge({ delta, cardDelay }: { delta: number; cardDelay: number }) {
  const reduced = useReducedMotion()
  if (delta === 0) return <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 700 }}>—</span>

  const positive = delta > 0
  const color = positive ? '#22C55E' : '#EF4444'
  const arrow = positive ? '▲' : '▼'
  const sign = positive ? '+' : '−'

  return (
    <span className="flex items-center gap-1 font-body font-bold" style={{ fontSize: 13, color }}>
      <motion.span
        initial={reduced ? false : { scale: 1 }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={reduced ? { duration: 0 } : { type: 'tween', ease: 'easeInOut', duration: 0.5, delay: cardDelay + 0.4 }}
      >
        {arrow}
      </motion.span>
      {sign}{Math.abs(delta)} pts
    </span>
  )
}

export default function PodiumCard({ entry, place }: Props) {
  const reduced = useReducedMotion()
  const isFirst = place === 1
  const avatarSize = isFirst ? 56 : 46
  const pointsSize = isFirst ? 58 : 46
  const nameSize = isFirst ? 17.5 : 15.5
  const cardDelay = CARD_DELAY[place]

  return (
    <motion.div
      data-podium={place}
      className="relative flex flex-col gap-3"
      initial={reduced ? false : { opacity: 0, y: 56 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduced
          ? { duration: 0 }
          : { ...SPRING, delay: cardDelay }
      }
      style={{
        background: 'var(--c-card)',
        borderRadius: 18,
        border: isFirst ? '2px solid var(--c-lime)' : '1px solid var(--c-card-border)',
        boxShadow: isFirst
          ? '0 16px 40px rgba(0,20,10,0.45)'
          : '0 10px 28px rgba(0,20,10,0.30)',
        padding: isFirst ? '26px 28px 24px' : '22px 24px 20px',
        marginTop: isFirst ? 0 : 30,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {/* Badge LEADER */}
      {isFirst && (
        <div
          className="absolute font-body font-bold"
          style={{
            top: -16,
            right: 22,
            background: 'var(--c-lime)',
            color: '#07261B',
            borderRadius: 999,
            fontSize: 12.5,
            fontWeight: 700,
            letterSpacing: '0.08em',
            padding: '5px 14px',
          }}
        >
          LEADER
        </div>
      )}

      {/* Rang + avatar + nom */}
      <div className="flex items-center gap-3">
        <span
          className="font-display font-bold italic"
          style={{
            fontSize: 38,
            lineHeight: 1,
            color: isFirst ? 'var(--c-lime)' : 'rgba(255,255,255,0.40)',
          }}
        >
          0{place}
        </span>
        <Avatar name={entry.name} size={avatarSize} onColor />
        <div>
          <div
            className="font-body font-bold"
            style={{ fontSize: nameSize, color: 'var(--c-ink)' }}
          >
            {entry.name}
          </div>
          <div className="mt-1">
            <ArrowBadge delta={entry.delta} cardDelay={cardDelay} />
          </div>
        </div>
      </div>

      {/* Points */}
      <div
        className="flex items-baseline gap-2"
        style={{ borderTop: '1px solid var(--c-line)', paddingTop: 12 }}
      >
        <OdometerScore
          value={entry.total_points}
          delay={cardDelay + 0.15}
          className="font-display font-bold italic"
          style={{ fontSize: pointsSize, lineHeight: 1, color: 'var(--c-ink)' }}
        />
        <span
          className="font-body font-bold"
          style={{ fontSize: 12, letterSpacing: '0.14em', color: 'var(--c-sub)' }}
        >
          PTS
        </span>
        {isFirst && (
          <span
            className="ml-auto"
            style={{
              width: 34,
              height: 8,
              background: 'var(--c-lime)',
              borderRadius: 999,
              display: 'inline-block',
            }}
          />
        )}
      </div>
    </motion.div>
  )
}
