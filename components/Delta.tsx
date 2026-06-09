interface Props {
  delta: number
  onColor?: boolean
  className?: string
}

export default function Delta({ delta, onColor = false, className = '' }: Props) {
  if (delta === 0) {
    return (
      <span
        className={`text-[13px] font-semibold font-body ${onColor ? 'text-white/70' : 'text-sub'} ${className}`}
      >
        —
      </span>
    )
  }

  const positive = delta > 0
  const colorClass = onColor
    ? 'text-white'
    : positive
    ? 'text-delta-pos'
    : 'text-delta-neg'

  const bgClass = onColor ? 'bg-white/[0.18] rounded px-2 py-0.5' : ''

  return (
    <span
      className={`text-[13.5px] font-bold font-body ${colorClass} ${bgClass} ${className}`}
    >
      {positive ? '+' : '−'}
      {Math.abs(delta)} pts {positive ? '▲' : '▼'}
    </span>
  )
}
