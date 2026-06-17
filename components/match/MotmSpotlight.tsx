'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { MatchLineupPlayer } from '@/lib/queries'
import { TEAM_NAME_FR, TEAM_COLORS } from '@/lib/flags'
import Flag from '@/components/Flag'

const POSITION_LABELS: Record<string, string> = {
  GK: 'Gardien', DEF: 'Défenseur', MID: 'Milieu', FWD: 'Attaquant',
}
const FALLBACK = { primary: '#2E5339', secondary: '#FFFFFF' }

/**
 * Encart « Player of the Match » FIFA, mis en avant sur un match terminé.
 *
 * - player non-null : le MOTM officiel FIFA (motmOfficial) → photo + stats.
 * - player null : le MOTM FIFA n'est pas encore tombé → placeholder + message.
 *
 * À n'afficher que sur un match terminé (la page s'en charge) ; rien avant ou
 * pendant le match. Le proxy (meilleur joueur) reste affiché ailleurs (badge
 * « Meilleur joueur » des compositions).
 */
export default function MotmSpotlight({ player }: { player: MatchLineupPlayer | null }) {
  const [imgError, setImgError] = useState(false)
  const accent = 'var(--c-lime)'

  // ── État d'attente : MOTM FIFA pas encore annoncé ──
  if (!player) {
    return (
      <section className="mt-6">
        <div
          className="flex items-center gap-4 rounded-2xl px-6 py-5"
          style={{ background: 'var(--c-card-overlay)', border: '1px solid var(--c-card-border)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        >
          <div
            className="flex-shrink-0 w-[64px] h-[64px] rounded-full flex items-center justify-center"
            style={{ border: '2px dashed var(--c-line)' }}
            aria-hidden
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--c-sub)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
            </svg>
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold font-body tracking-[0.14em] uppercase" style={{ color: accent }}>
              ⭐ Player of the Match
            </span>
            <p className="mt-1 text-[13px] font-body text-sub">
              Le Player of the Match FIFA sera affiché ici dès son annonce, peu après la fin du match.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const colors = TEAM_COLORS[player.nationality] ?? FALLBACK
  const showPhoto = !!player.photo_url && !imgError
  const initials = player.name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  const acts: string[] = []
  if (player.goals > 0) acts.push(`${player.goals} but${player.goals > 1 ? 's' : ''}`)
  if (player.assists > 0) acts.push(`${player.assists} passe${player.assists > 1 ? 's' : ''} déc.`)

  return (
    <section className="mt-6">
      <div
        className="relative flex flex-col sm:flex-row items-center gap-4 sm:gap-6 rounded-2xl px-6 py-6 sm:px-8 overflow-hidden"
        style={{
          background: 'var(--c-card-overlay)',
          border: '1px solid var(--c-card-border)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {/* Halo couleur d'accent */}
        <div
          className="absolute -left-10 -top-10 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: accent, opacity: 0.1, filter: 'blur(40px)' }}
          aria-hidden
        />

        {/* Photo */}
        <Link href={`/players/${player.id}`} className="flex-shrink-0">
          <div
            className="relative w-[104px] h-[104px] md:w-[120px] md:h-[120px] rounded-full overflow-hidden"
            style={{ background: colors.primary, border: `3px solid ${accent}`, boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}
          >
            {showPhoto ? (
              <Image
                src={player.photo_url!}
                alt={player.name}
                fill
                priority
                className="object-cover object-top"
                sizes="120px"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display font-bold text-[34px]" style={{ color: colors.secondary }}>{initials}</span>
              </div>
            )}
          </div>
        </Link>

        {/* Infos */}
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-bold font-body tracking-[0.14em] uppercase mb-1.5"
            style={{ color: accent }}
          >
            ⭐ Player of the Match
          </span>
          <Link href={`/players/${player.id}`} className="block hover:opacity-80 transition-opacity">
            <h2 className="font-display font-bold italic uppercase text-[28px] md:text-[36px] leading-none text-white">
              {player.name}
            </h2>
          </Link>
          <div className="flex items-center gap-2 justify-center sm:justify-start mt-2 text-[13px] font-body text-sub">
            <Flag teamName={player.nationality} size="16x12" />
            <span>{TEAM_NAME_FR[player.nationality] ?? player.nationality}</span>
            <span aria-hidden>·</span>
            <span>{POSITION_LABELS[player.position] ?? player.position}</span>
          </div>

          {/* Faits + points */}
          <div className="flex items-center gap-3 justify-center sm:justify-start mt-3 flex-wrap">
            {acts.length > 0 && (
              <span className="text-[13px] font-body font-semibold text-ink">{acts.join(' · ')}</span>
            )}
            <span
              className="font-display font-bold italic text-[15px] tabular-nums rounded-full px-3 py-1"
              style={{ background: accent, color: '#07261B' }}
            >
              {player.points > 0 ? '+' : ''}{player.points} pts
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
