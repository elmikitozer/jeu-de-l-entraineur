'use client'

import { useState } from 'react'
import Link from 'next/link'
import Avatar from './Avatar'
import LiveDot from './LiveDot'
import Flag from './Flag'
import type { TeamLine } from '@/lib/queries'
import { TEAM_NAME_FR } from '@/lib/flags'

interface Props {
  lines: TeamLine[]
}

const ORDER: TeamLine['label'][] = ['Attaque', 'Milieu', 'Défense', 'Gardien']

const LINE_COLORS: Record<string, string> = {
  Attaque: 'var(--c-red)',
  Milieu:  'var(--c-blue)',
  Défense: 'var(--c-green)',
  Gardien: 'var(--c-sub)',
}

// Chevron SVG
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function RosterSidebar({ lines }: Props) {
  // Sur mobile : Attaque ouvert par défaut, autres fermés
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['Attaque']))

  function toggle(label: string) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const sorted = ORDER
    .map((label) => lines.find((l) => l.label === label))
    .filter(Boolean) as TeamLine[]

  return (
    <div className="w-full lg:w-[380px] flex-shrink-0 flex flex-col gap-3.5">
      {sorted.map((line) => {
        const subtotal = line.players.reduce((s, p) => s + p.points, 0)
        const isOpen = openSections.has(line.label)

        return (
          <div
            key={line.label}
            className="bg-card border border-line rounded-xl overflow-hidden"
          >
            {/* En-tête section — cliquable sur mobile, statique desktop */}
            <button
              type="button"
              onClick={() => toggle(line.label)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 border-b border-line md:cursor-default"
              aria-expanded={isOpen}
            >
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ background: LINE_COLORS[line.label] }}
              />
              <span className="font-display font-bold text-[17px] uppercase tracking-[0.08em] text-ink">
                {line.label}
              </span>
              <span className="ml-auto text-[11.5px] font-semibold font-body text-sub">
                {subtotal} pts
              </span>
              {/* Chevron visible uniquement sur mobile */}
              <span className="ml-1 text-sub md:hidden">
                <Chevron open={isOpen} />
              </span>
            </button>

            {/* Joueurs — toujours visible sur desktop (md:block), accordéon sur mobile */}
            <div className={`${isOpen ? 'block' : 'hidden'} md:block`}>
              {line.players.map((player) => (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-zebra transition-colors border-b border-line last:border-b-0"
                >
                  <Avatar name={player.name} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold font-body text-ink truncate">
                        {player.name}
                      </span>
                      {player.isLive && <LiveDot />}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Flag teamName={player.nationality} size="16x12" />
                      <span className="text-[10px] text-sub font-body">
                        {TEAM_NAME_FR[player.nationality] ?? player.nationality}
                      </span>
                    </div>
                  </div>
                  <span className="font-display font-bold italic text-[20px] text-ink flex-shrink-0">
                    {player.points}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
