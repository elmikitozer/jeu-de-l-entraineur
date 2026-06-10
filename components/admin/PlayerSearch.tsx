'use client'

import { useState, useRef, useEffect } from 'react'
import type { Player, Position } from '@/lib/types'

interface Props {
  slot: number
  position: Position
  players: Player[]
  value: Player | null
  onChange: (player: Player | null) => void
  disabledIds: Set<string>
}

const POSITION_LABEL: Record<Position, string> = {
  GK: 'gardien',
  DEF: 'défenseur',
  MID: 'milieu / attaquant',
  FWD: 'attaquant / milieu',
}

// Pour les slots MID/FWD : tout joueur non-GK non-DEF est accepté
function positionAllowed(playerPos: string | null | undefined, slotPos: Position): boolean {
  if (slotPos === 'GK') return playerPos === 'GK'
  if (slotPos === 'DEF') return playerPos === 'DEF'
  return playerPos !== 'GK' && playerPos !== 'DEF'
}

function matchesSearch(playerName: string, query: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .trim()
  const name = normalize(playerName)
  const words = normalize(query).split(/\s+/).filter(Boolean)
  return words.every((word) => name.includes(word))
}

export function PlayerSearch({ slot, position, players, value, onChange, disabledIds }: Props) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = players.filter(
    (p) => positionAllowed(p.position, position) && matchesSearch(p.name, search)
  )

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function select(player: Player) {
    onChange(player)
    setSearch('')
    setOpen(false)
  }

  function clear() {
    onChange(null)
    setSearch('')
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1.5 bg-[#1a1a1a] border border-[#333] rounded px-2.5 py-1.5 min-h-[36px] focus-within:border-[#C9A84C] transition-colors">
        <span className="text-xs text-gray-600 font-mono shrink-0">{slot}</span>
        {value ? (
          <>
            <span className="text-sm text-white flex-1 truncate">{value.name}</span>
            <span className="text-xs text-gray-500 bg-[#2a2a2a] px-1.5 py-0.5 rounded shrink-0">
              {value.nationality_code}
            </span>
            <button
              type="button"
              onClick={clear}
              className="text-gray-500 hover:text-red-400 transition-colors ml-0.5 shrink-0"
              aria-label="Retirer ce joueur"
            >
              ✕
            </button>
          </>
        ) : (
          <input
            type="text"
            placeholder={`Rechercher un ${POSITION_LABEL[position]}…`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            className="bg-transparent text-sm text-white flex-1 outline-none placeholder-gray-600 min-w-0"
          />
        )}
      </div>

      {open && !value && (
        <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-[#1e1e1e] border border-[#333] rounded shadow-lg max-h-44 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">Aucun résultat</div>
          ) : (
            filtered.map((p) => {
              const disabled = disabledIds.has(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => !disabled && select(p)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors ${
                    disabled
                      ? 'opacity-35 cursor-not-allowed'
                      : 'hover:bg-[#2a2a2a] cursor-pointer'
                  }`}
                >
                  <span className="text-white truncate">{p.name}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    {p.position !== position && (
                      <span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-1 rounded">{p.position}</span>
                    )}
                    <span className="text-gray-400 text-xs">{p.nationality_code}</span>
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
