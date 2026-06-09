import type { Player } from '@/lib/types'

interface Props {
  selections: Record<number, Player | null>
}

function PlayerDot({ player }: { player: Player | null }) {
  const initials = player
    ? player.name.split(' ').pop()?.slice(0, 6) ?? '?'
    : null

  return (
    <div className="flex flex-col items-center gap-0.5 w-14">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors ${
          player
            ? 'bg-[#1d4520] border-[#3CAC3B] text-white'
            : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-700'
        }`}
      >
        {player ? player.nationality_code : '?'}
      </div>
      <span
        className={`text-[10px] text-center leading-tight max-w-full truncate px-0.5 ${
          player ? 'text-gray-300' : 'text-gray-700'
        }`}
        title={player?.name}
      >
        {initials ?? '—'}
      </span>
    </div>
  )
}

export function FormationPreview({ selections }: Props) {
  const fwds = [selections[9], selections[10], selections[11]]
  const mids = [selections[6], selections[7], selections[8]]
  const defs = [selections[2], selections[3], selections[4], selections[5]]
  const gk = selections[1]

  return (
    <div className="bg-[#0b230e] border border-[#1a3d1c] rounded-lg overflow-hidden">
      {/* Terrain */}
      <div className="p-4 space-y-4">
        <div className="flex justify-around">
          {fwds.map((p, i) => (
            <PlayerDot key={i} player={p} />
          ))}
        </div>
        <div className="flex justify-around">
          {mids.map((p, i) => (
            <PlayerDot key={i} player={p} />
          ))}
        </div>
        <div className="flex justify-around">
          {defs.map((p, i) => (
            <PlayerDot key={i} player={p} />
          ))}
        </div>
        <div className="flex justify-center border-t border-[#1a3d1c] pt-3">
          <PlayerDot player={gk} />
        </div>
      </div>

      {/* Légende */}
      <div className="border-t border-[#1a3d1c] px-4 py-2 flex justify-between text-[10px] text-gray-600">
        <span>ATT (3)</span>
        <span>MIL (3)</span>
        <span>DEF (4)</span>
        <span>GK (1)</span>
      </div>
    </div>
  )
}
