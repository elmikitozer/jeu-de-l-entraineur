'use client'

import type { Player } from '@/lib/types'

export interface ParticipantEntry {
  id: string
  name: string
  total_points: number
  team: Array<{ slot: number; player: Player }>
}

interface Props {
  participants: ParticipantEntry[]
  onSelect: (p: ParticipantEntry) => void
  selectedId: string | null
}

export function ParticipantList({ participants, onSelect, selectedId }: Props) {
  if (participants.length === 0) {
    return <p className="text-gray-600 text-sm px-1">Aucun participant pour l&apos;instant.</p>
  }

  return (
    <div className="space-y-1">
      {participants.map((p) => {
        const isSelected = p.id === selectedId
        const teamSize = p.team.length

        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p)}
            className={`w-full text-left px-3 py-2.5 rounded-md flex items-center justify-between gap-2 transition-colors ${
              isSelected
                ? 'bg-[#C9A84C] text-black'
                : 'bg-[#1a1a1a] text-white hover:bg-[#222]'
            }`}
          >
            <span className="font-medium text-sm truncate">{p.name}</span>
            <span
              className={`text-xs font-mono shrink-0 ${
                isSelected
                  ? 'text-black/70'
                  : teamSize === 11
                    ? 'text-[#3CAC3B]'
                    : 'text-orange-400'
              }`}
            >
              {teamSize}/11
            </span>
          </button>
        )
      })}
    </div>
  )
}
