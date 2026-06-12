'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useReducedMotion } from 'framer-motion'
import type { MatchFantasyEntry, MatchRankingImpact } from '@/lib/queries'
import type { PointsBreakdown } from '@/lib/types'
import Flag from '@/components/Flag'

interface Props {
  fantasy: MatchFantasyEntry[]
  rankingImpact: MatchRankingImpact[]
}

const SHORT_LABELS: Record<keyof PointsBreakdown, string> = {
  win_bonus: 'victoire',
  draw_bonus: 'nul',
  goal_position_bonus: 'but',
  goal_freekick_bonus: 'coup franc',
  goal_penalty_bonus: 'but penalty',
  assist_bonus: 'passe déc.',
  motm_bonus: 'MOTM',
  cleansheet_bonus: 'clean sheet',
  penalty_saved_bonus: 'penalty arrêté',
  red_card_malus: 'carton rouge',
}

function breakdownParts(b: PointsBreakdown): string[] {
  return (Object.keys(SHORT_LABELS) as Array<keyof PointsBreakdown>)
    .filter((k) => b[k] !== 0)
    .map((k) => `${b[k] > 0 ? '+' : ''}${b[k]} ${SHORT_LABELS[k]}`)
}

function CountUp({ value }: { value: number }) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(reduced ? value : 0)

  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      return
    }
    let raf = 0
    const start = performance.now()
    const duration = 700
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(value * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, reduced])

  return (
    <span className="tabular-nums">
      {value > 0 ? '+' : ''}
      {display}
    </span>
  )
}

function FantasyRow({ entry }: { entry: MatchFantasyEntry }) {
  const positive = entry.points >= 0
  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <Flag teamName={entry.player.nationality} size="24x18" className="flex-shrink-0" />
      <div className="flex flex-col min-w-0 flex-1">
        <Link
          href={`/players/${entry.player.id}`}
          className="font-semibold font-body text-[14px] text-ink truncate hover:opacity-75 transition-opacity"
        >
          {entry.player.name}
          <span className="text-sub font-normal"> · {entry.player.position}</span>
        </Link>
        <span className="text-[11px] font-body text-sub truncate">
          {breakdownParts(entry.breakdown).join(' · ')}
        </span>
        {entry.selectedBy.length > 0 && (
          <span className="text-[10.5px] font-body mt-0.5" style={{ color: 'var(--c-lime)' }}>
            Choisi par {entry.selectedBy.join(', ')}
          </span>
        )}
      </div>
      <span
        className="font-display font-bold italic text-[18px] px-2.5 py-0.5 rounded-lg flex-shrink-0"
        style={
          positive
            ? { background: 'rgba(200,245,66,0.14)', color: 'var(--c-lime)' }
            : { background: 'rgba(239,68,68,0.14)', color: 'var(--c-red)' }
        }
      >
        <CountUp value={entry.points} />
      </span>
    </div>
  )
}

export default function FantasyImpact({ fantasy, rankingImpact }: Props) {
  if (fantasy.length === 0) {
    return (
      <div className="bg-card border border-line rounded-2xl px-6 py-10 text-center">
        <p className="text-[13px] font-body text-sub">
          Aucun joueur de la base n&apos;a généré de points sur ce match.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Points générés */}
      <div className="bg-card border border-line rounded-2xl overflow-hidden divide-y divide-line">
        {fantasy.map((e, i) => (
          <FantasyRow key={`${e.player.id}-${i}`} entry={e} />
        ))}
      </div>

      {/* Impact classement */}
      <div className="bg-card border border-line rounded-2xl p-5">
        <h3 className="font-display font-bold italic uppercase text-[16px] text-white mb-3">
          Impact sur le classement
        </h3>
        {rankingImpact.length === 0 ? (
          <p className="text-[12.5px] font-body text-sub">
            Aucun joueur sélectionné par les participants n&apos;a joué ce match — le classement est inchangé.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {rankingImpact.map((r) => (
              <div key={r.participantId} className="flex items-center justify-between">
                <Link
                  href={`/equipes/${r.participantId}`}
                  className="font-semibold font-body text-[14px] text-ink hover:opacity-75 transition-opacity"
                >
                  {r.participantName}
                </Link>
                <span
                  className={`font-display font-bold italic text-[16px] tabular-nums ${
                    r.delta > 0 ? 'text-delta-pos' : r.delta < 0 ? 'text-delta-neg' : 'text-sub'
                  }`}
                >
                  {r.delta > 0 ? '▲ +' : r.delta < 0 ? '▼ ' : ''}
                  {r.delta}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
