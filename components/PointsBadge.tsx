interface Props {
  points: number
  size?: 'sm' | 'md' | 'lg'
  white?: boolean
}

export default function PointsBadge({ points, size = 'md', white = false }: Props) {
  const sizeClass = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1',
  }[size]

  if (white) {
    return (
      <span
        className={`inline-block font-display font-bold italic bg-white text-ink rounded shadow-md ${sizeClass}`}
      >
        {points} pts
      </span>
    )
  }

  const colorClass =
    points > 0
      ? 'text-delta-pos'
      : points < 0
      ? 'text-delta-neg'
      : 'text-sub'

  return (
    <span className={`inline-block font-display font-bold italic ${colorClass} ${sizeClass}`}>
      {points > 0 ? '+' : ''}
      {points}
    </span>
  )
}
