'use client'

import { useState } from 'react'
import Image from 'next/image'
import LiveBadge from './LiveBadge'
import Flag from './Flag'
import { TEAM_COLORS } from '@/lib/flags'

interface Props {
  name: string
  nationality: string
  photoUrl: string | null
  points: number
  isLive?: boolean
}

const FALLBACK = { primary: '#2E5339', secondary: '#FFFFFF' }

function displayName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return parts[0][0] + '. ' + parts.slice(1).join(' ')
}

export default function PitchPlayer({ name, nationality, photoUrl, points, isLive = false }: Props) {
  const [imgError, setImgError] = useState(false)
  const colors = TEAM_COLORS[nationality] ?? FALLBACK
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const showPhoto = !!photoUrl && !imgError

  return (
    // Slot : 36px mobile, 44px desktop — le texte peut déborder latéralement
    <div className="flex flex-col items-center gap-[3px] relative w-9 md:w-11" style={{ minWidth: 0 }}>
      {isLive && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
          <LiveBadge small />
        </span>
      )}

      {/* ── Cercle photo ── */}
      <div
        className="relative flex-shrink-0 w-9 h-9 md:w-11 md:h-11 rounded-full overflow-hidden border-2 border-white"
        style={{
          background: colors.primary,
          boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
        }}
      >
        {showPhoto ? (
          <Image
            src={photoUrl!}
            alt={name}
            fill
            className="object-cover object-top"
            sizes="(max-width: 768px) 36px, 44px"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="font-display font-bold leading-none"
              style={{ color: colors.secondary, fontSize: 13 }}
            >
              {initials}
            </span>
          </div>
        )}
      </div>

      {/* ── Nom + drapeau (desktop seulement) ── */}
      <div
        className="flex items-center justify-center gap-[3px]"
        style={{ overflow: 'visible', whiteSpace: 'nowrap' }}
      >
        <span
          className="font-semibold leading-none"
          style={{
            fontSize: 9,
            color: 'white',
            textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            fontFamily: 'var(--font-body, system-ui, sans-serif)',
          }}
        >
          {displayName(name).slice(0, 15)}
        </span>
        <span className="hidden md:inline-flex">
          <Flag teamName={nationality} size="16x12" />
        </span>
      </div>

      {/* ── Points ── */}
      <div
        className="font-display font-bold italic leading-none text-white"
        style={{ fontSize: 10, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
      >
        {points}
      </div>
    </div>
  )
}
