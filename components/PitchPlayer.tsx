import Avatar from './Avatar'
import LiveBadge from './LiveBadge'

interface Props {
  name: string
  nationalityCode: string
  points: number
  isLive?: boolean
}

export default function PitchPlayer({ name, nationalityCode, points, isLive = false }: Props) {
  return (
    <div className="flex flex-col items-center gap-[5px] relative" style={{ width: 110 }}>
      {isLive && (
        <span className="absolute -top-2.5 right-3.5 z-10">
          <LiveBadge small />
        </span>
      )}

      <Avatar name={name} size={52} ring />

      {/* Name + country badge */}
      <div
        className="flex items-center gap-1.5 rounded-md px-2.5 py-[3px] text-white"
        style={{ background: 'rgba(10,24,16,0.72)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
      >
        <span>{name}</span>
        <span style={{ fontSize: 9.5, fontWeight: 700, opacity: 0.75, letterSpacing: '0.06em' }}>
          {nationalityCode}
        </span>
      </div>

      {/* Points badge */}
      <div
        className="font-display font-bold italic bg-white text-ink rounded-md shadow-md"
        style={{ fontSize: 15, padding: '1px 9px' }}
      >
        {points} pts
      </div>
    </div>
  )
}
