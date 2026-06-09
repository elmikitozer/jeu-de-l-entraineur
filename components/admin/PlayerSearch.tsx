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
  MID: 'milieu',
  FWD: 'attaquant',
}

export function PlayerSearch({ slot, position, players, value, onChange, disabledIds }: Props) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = players.filter(
    (p) =>
      p.position === position &&
      p.name.toLowerCase().includes(search.toLowerCase())
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
                  <span className="text-gray-400 text-xs shrink-0">{p.nationality_code}</span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
