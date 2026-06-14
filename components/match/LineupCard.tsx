'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import type { MatchLineupPlayer } from '@/lib/queries'
import { TEAM_NAME_FR, getCountryCode } from '@/lib/flags'
import Avatar from '@/components/Avatar'
import Flag from '@/components/Flag'

interface Props {
  team: string
  players: MatchLineupPlayer[]
  matchId: string
}

const POSITION_LABELS: Record<string, string> = {
  GK: 'Gardien',
  DEF: 'Défenseur',
  MID: 'Milieu',
  FWD: 'Attaquant',
}

function PointsPill({ points }: { points: number }) {
  const cls =
    points > 0
      ? 'text-delta-pos'
      : points < 0
      ? 'text-delta-neg'
      : 'text-sub'
  return (
    <span className={`font-display font-bold italic text-[17px] tabular-nums ${cls}`}>
      {points > 0 ? '+' : ''}
      {points}
    </span>
  )
}

function PlayerRow({ p, index }: { p: MatchLineupPlayer; index: number }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={reduced ? { duration: 0 } : { duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
    >
      <Link
        href={`/players/${p.id}`}
        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-zebra transition-colors"
      >
        <Avatar name={p.name} size={34} />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-semibold font-body text-[14px] text-ink truncate">{p.name}</span>
          <span className="flex items-center gap-1.5 text-[11px] font-body text-sub">
            {POSITION_LABELS[p.position] ?? p.position}
            {p.minutes != null && p.minutes > 0 && <span title="Minutes jouées">· {p.minutes}&apos;</span>}
            {p.goals > 0 && <span title="But(s)">· ⚽{p.goals > 1 ? `×${p.goals}` : ''}</span>}
            {p.assists > 0 && <span style={{ color: 'var(--c-blue)' }} title="Passe(s)">· →{p.assists > 1 ? `×${p.assists}` : ''}</span>}
            {p.motm && <span style={{ color: 'var(--c-lime)' }} title="Homme du match">· MOTM</span>}
            {p.red && <span className="inline-block w-2 h-3 rounded-[1px] align-middle" style={{ background: 'var(--c-red)' }} title="Carton rouge" />}
          </span>
        </div>
        <PointsPill points={p.points} />
      </Link>
    </motion.div>
  )
}

export default function LineupCard({ team, players, matchId }: Props) {
  const [open, setOpen] = useState(false)
  const played = players.filter((p) => p.played)

  return (
    <div className="bg-card border border-line rounded-2xl overflow-hidden">
      {/* En-tête : lien vers la nation + toggle mobile pour déplier */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-line">
        {(() => {
          const code = getCountryCode(team)
          const content = (
            <>
              <Flag teamName={team} size="24x18" className="flex-shrink-0" />
              <span className="font-display font-bold italic uppercase text-[18px] text-white truncate group-hover:text-[color:var(--c-lime)] transition-colors">
                {TEAM_NAME_FR[team] ?? team}
              </span>
            </>
          )
          return code ? (
            <Link href={`/teams/${code}?from=/matches/${matchId}`} className="group flex items-center gap-2.5 flex-1 min-w-0">
              {content}
            </Link>
          ) : (
            <span className="flex items-center gap-2.5 flex-1 min-w-0">{content}</span>
          )
        })()}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 md:cursor-default"
          aria-label={open ? 'Replier' : 'Déplier'}
        >
          <span className="text-[11px] font-body text-sub whitespace-nowrap">{played.length} joueurs</span>
          <span className="text-sub text-[12px] md:hidden">{open ? '▲' : '▼'}</span>
        </button>
      </div>

      {/* Liste joueurs */}
      <div className={`${open ? 'block' : 'hidden'} md:block p-1.5`}>
        {played.length === 0 ? (
          <p className="text-center py-6 text-[12px] font-body text-sub">
            Aucun joueur de notre base n&apos;a figuré dans cette feuille de match.
          </p>
        ) : (
          played.map((p, i) => <PlayerRow key={p.id} p={p} index={i} />)
        )}
      </div>
    </div>
  )
}
