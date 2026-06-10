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
  onDelete: (p: ParticipantEntry) => void
  selectedId: string | null
}

export function ParticipantList({ participants, onSelect, onDelete, selectedId }: Props) {
  if (participants.length === 0) {
    return <p className="text-gray-600 text-sm px-1">Aucun participant pour l&apos;instant.</p>
  }

  return (
    <div className="space-y-1">
      {participants.map((p) => {
        const isSelected = p.id === selectedId
        const teamSize = p.team.length

        return (
          <div
            key={p.id}
            className={`w-full flex items-center gap-1 rounded-md transition-colors ${
              isSelected ? 'bg-[#C9A84C]' : 'bg-[#1a1a1a] hover:bg-[#222]'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(p)}
              className="flex-1 text-left px-3 py-2.5 flex items-center justify-between gap-2 min-w-0"
            >
              <span
                className={`font-medium text-sm truncate ${isSelected ? 'text-black' : 'text-white'}`}
              >
                {p.name}
              </span>
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
            <button
              type="button"
              title={`Supprimer l'équipe de ${p.name}`}
              onClick={(e) => {
                e.stopPropagation()
                onDelete(p)
              }}
              className={`shrink-0 px-2 py-2.5 text-xs transition-colors ${
                isSelected
                  ? 'text-black/50 hover:text-black'
                  : 'text-gray-600 hover:text-red-400'
              }`}
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}
