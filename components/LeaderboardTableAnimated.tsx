'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import Avatar from './Avatar'
import Delta from './Delta'
import PlacesBadge from './PlacesBadge'
import type { LeaderboardEntry } from '@/lib/queries'

interface Props {
  rest: LeaderboardEntry[]
  maxPoints: number
}

export default function LeaderboardTableAnimated({ rest, maxPoints }: Props) {
  const reduced = useReducedMotion()

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--c-card)',
        boxShadow: '0 14px 36px rgba(0,20,10,0.35)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid var(--c-card-border)',
        color: 'var(--c-ink)',
      }}
    >
      {/* En-tête mobile */}
      <div
        className="grid md:hidden px-4 py-3.5 text-[11px] font-bold font-body tracking-[0.12em] uppercase"
        style={{
          gridTemplateColumns: '48px 1fr 90px 80px',
          borderBottom: '1px solid var(--c-line)',
          color: 'var(--c-sub)',
        }}
      >
        <span>#</span>
        <span>Coach</span>
        <span className="text-right">Évolution</span>
        <span className="text-right">Points</span>
      </div>

      {/* En-tête desktop */}
      <div
        className="hidden md:grid px-6 py-3.5 text-[11px] font-bold font-body tracking-[0.12em] uppercase"
        style={{
          gridTemplateColumns: '56px 1fr 220px 130px 100px',
          borderBottom: '2px solid var(--c-line)',
          color: 'var(--c-sub)',
        }}
      >
        <span>#</span>
        <span>Coach</span>
        <span>Progression</span>
        <span className="text-right">Évolution</span>
        <span className="text-right">Points</span>
      </div>

      {/* Lignes */}
      {rest.map((entry, idx) => (
        <motion.div
          key={entry.id}
          initial={reduced ? false : { opacity: 0, x: -24 }}
          whileInView={reduced ? {} : { opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 0.35, delay: idx * 0.06, ease: 'easeOut' }
          }
        >
          <Link href={`/equipes/${entry.id}`} className="block hover:opacity-80 transition-opacity">
            {/* Mobile */}
            <div
              className="grid md:hidden items-center px-4 py-3"
              style={{
                gridTemplateColumns: '48px 1fr 90px 80px',
                background: idx % 2 === 0 ? 'var(--c-zebra)' : 'transparent',
                borderBottom: idx < rest.length - 1 ? '1px solid var(--c-line)' : 'none',
              }}
            >
              <span className="font-display font-bold italic text-[22px]" style={{ color: 'var(--c-sub)' }}>
                {entry.rank}
              </span>
              <span className="flex items-center gap-3 min-w-0">
                <Avatar name={entry.name} size={34} onColor />
                <span className="text-[14px] font-semibold font-body truncate" style={{ color: 'var(--c-ink)' }}>
                  {entry.name}
                </span>
              </span>
              <span className="flex flex-col items-end gap-1">
                <Delta delta={entry.delta} />
                {(entry.placesGained !== 0 || entry.delta !== 0) && (
                  <PlacesBadge places={entry.placesGained} />
                )}
              </span>
              <span className="text-right font-display font-bold italic text-[24px]" style={{ color: 'var(--c-ink)' }}>
                {entry.total_points}
              </span>
            </div>

            {/* Desktop */}
            <div
              className="hidden md:grid items-center px-6 py-3"
              style={{
                gridTemplateColumns: '56px 1fr 220px 130px 100px',
                background: idx % 2 === 0 ? 'var(--c-zebra)' : 'transparent',
                borderBottom: idx < rest.length - 1 ? '1px solid var(--c-line)' : 'none',
              }}
            >
              <span className="font-display font-bold italic text-[22px]" style={{ color: 'var(--c-sub)' }}>
                {entry.rank}
              </span>
              <span className="flex items-center gap-3 min-w-0">
                <Avatar name={entry.name} size={36} onColor />
                <span className="text-[15px] font-semibold font-body truncate" style={{ color: 'var(--c-ink)' }}>
                  {entry.name}
                </span>
              </span>
              {/* Barre de progression */}
              <span className="pr-8">
                <span className="block h-1.5 rounded-full" style={{ background: 'var(--c-line)' }}>
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.round((entry.total_points / maxPoints) * 100)}%`,
                      background: 'linear-gradient(90deg, var(--c-green), var(--c-lime))',
                    }}
                  />
                </span>
              </span>
              <span className="flex items-center justify-end gap-2">
                <Delta delta={entry.delta} />
                {(entry.placesGained !== 0 || entry.delta !== 0) && (
                  <PlacesBadge places={entry.placesGained} />
                )}
              </span>
              <span className="text-right font-display font-bold italic text-[26px]" style={{ color: 'var(--c-ink)' }}>
                {entry.total_points}
              </span>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
