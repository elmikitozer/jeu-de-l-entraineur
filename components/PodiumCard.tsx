import type { LeaderboardEntry } from '@/lib/queries'
import Avatar from './Avatar'
import Delta from './Delta'

interface Props {
  entry: LeaderboardEntry
  place: 1 | 2 | 3
}

const PODIUM_LABELS: Record<number, string> = {
  1: '★ LEADER',
  2: '2ᵉ PLACE',
  3: '3ᵉ PLACE',
}

const PODIUM_BG_LIGHT: Record<number, string> = {
  1: 'var(--c-podium1)',
  2: 'var(--c-podium2)',
  3: 'var(--c-podium3)',
}


export default function PodiumCard({ entry, place }: Props) {
  const isFirst = place === 1
  const avatarSize = isFirst ? 62 : 50
  const pointsSize = isFirst ? 72 : 54
  const nameSize = isFirst ? 19 : 16.5

  return (
    <div
      data-podium={place}
      className="relative overflow-hidden rounded-2xl flex flex-col gap-3 text-white"
      style={{
        flex: isFirst ? '1.2' : '1',
        marginTop: isFirst ? 0 : 28,
        padding: isFirst ? '30px 30px 26px' : '24px 26px 22px',
        background: PODIUM_BG_LIGHT[place],
      }}
    >

      {/* Ghost number */}
      <div
        className="absolute pointer-events-none font-display font-bold italic text-white/[0.13] select-none"
        style={{ right: -10, bottom: -34, fontSize: 170, lineHeight: 1 }}
      >
        {place}
      </div>

      {/* Label */}
      <div className="font-display font-bold text-base tracking-[0.2em] opacity-85 relative z-10">
        {PODIUM_LABELS[place]}
      </div>

      {/* Avatar + nom */}
      <div className="flex items-center gap-3.5 relative z-10">
        <Avatar name={entry.name} size={avatarSize} onColor />
        <div>
          <div className="font-body font-bold" style={{ fontSize: nameSize }}>
            {entry.name}
          </div>
          <div className="mt-1">
            <Delta delta={entry.delta} onColor />
          </div>
        </div>
      </div>

      {/* Points */}
      <div
        className="font-display font-bold italic relative z-10"
        style={{ fontSize: pointsSize, lineHeight: 0.95 }}
      >
        {entry.total_points}
        <span className="font-normal ml-2 opacity-80 tracking-widest" style={{ fontSize: 20 }}>
          PTS
        </span>
      </div>
    </div>
  )
}
