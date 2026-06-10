import type { LeaderboardEntry } from '@/lib/queries'
import Avatar from './Avatar'
import Delta from './Delta'

interface Props {
  entry: LeaderboardEntry
  place: 1 | 2 | 3
}

export default function PodiumCard({ entry, place }: Props) {
  const isFirst = place === 1
  const avatarSize = isFirst ? 56 : 46
  const pointsSize = isFirst ? 58 : 46
  const nameSize = isFirst ? 17.5 : 15.5

  return (
    <div
      data-podium={place}
      className="relative flex flex-col gap-3"
      style={{
        background: 'var(--c-card)',
        borderRadius: 18,
        border: isFirst ? '3px solid var(--c-lime)' : 'none',
        boxShadow: isFirst
          ? '0 16px 40px rgba(0,40,25,0.30)'
          : '0 10px 28px rgba(0,40,25,0.20)',
        padding: isFirst ? '26px 28px 24px' : '22px 24px 20px',
        marginTop: isFirst ? 0 : 30,
      }}
    >
      {/* Badge LEADER flottant */}
      {isFirst && (
        <div
          className="absolute font-body font-bold"
          style={{
            top: -16,
            right: 22,
            background: 'var(--c-lime)',
            color: 'var(--c-ink)',
            borderRadius: 999,
            fontSize: 12.5,
            fontWeight: 700,
            letterSpacing: '0.08em',
            padding: '5px 14px',
          }}
        >
          LEADER
        </div>
      )}

      {/* Rang + avatar + nom */}
      <div className="flex items-center gap-3">
        <span
          className="font-display font-bold italic"
          style={{
            fontSize: 38,
            lineHeight: 1,
            color: isFirst ? 'var(--c-green)' : '#B8CCC1',
          }}
        >
          0{place}
        </span>
        <Avatar name={entry.name} size={avatarSize} />
        <div>
          <div
            className="font-body font-bold"
            style={{ fontSize: nameSize, color: 'var(--c-ink)' }}
          >
            {entry.name}
          </div>
          <div className="mt-1">
            <Delta delta={entry.delta} />
          </div>
        </div>
      </div>

      {/* Points séparés par une ligne */}
      <div
        className="flex items-baseline gap-2"
        style={{ borderTop: '1px solid var(--c-line)', paddingTop: 12 }}
      >
        <span
          className="font-display font-bold italic"
          style={{ fontSize: pointsSize, lineHeight: 1, color: 'var(--c-ink)' }}
        >
          {entry.total_points}
        </span>
        <span
          className="font-body font-bold"
          style={{ fontSize: 12, letterSpacing: '0.14em', color: 'var(--c-sub)' }}
        >
          PTS
        </span>
        {/* Barre lime leader */}
        {isFirst && (
          <span
            className="ml-auto"
            style={{
              width: 34,
              height: 8,
              background: 'var(--c-lime)',
              borderRadius: 999,
              display: 'inline-block',
            }}
          />
        )}
      </div>
    </div>
  )
}
