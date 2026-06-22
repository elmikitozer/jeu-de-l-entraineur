interface Props {
  /** Rangs gagnés (+) ou perdus (−) sur la fenêtre 24h. */
  places: number
  className?: string
}

/**
 * Petit badge pilule indiquant le nombre de places gagnées/perdues, affiché à
 * côté du delta de points dans le classement. Vert si montée, rouge si descente,
 * neutre « = » si le rang n'a pas bougé malgré une activité.
 */
export default function PlacesBadge({ places, className = '' }: Props) {
  const positive = places > 0
  const negative = places < 0

  const color = positive ? '#22C55E' : negative ? '#EF4444' : 'var(--c-sub)'
  const bg = positive
    ? 'rgba(34,197,94,0.14)'
    : negative
    ? 'rgba(239,68,68,0.14)'
    : 'var(--c-line)'
  const label = positive ? `▲ ${places}` : negative ? `▼ ${Math.abs(places)}` : '='

  return (
    <span
      className={`inline-flex items-center font-body font-bold rounded ${className}`}
      style={{ fontSize: 11.5, lineHeight: 1, color, background: bg, padding: '3px 7px' }}
      title={
        positive
          ? `${places} place${places > 1 ? 's' : ''} gagnée${places > 1 ? 's' : ''}`
          : negative
          ? `${Math.abs(places)} place${Math.abs(places) > 1 ? 's' : ''} perdue${Math.abs(places) > 1 ? 's' : ''}`
          : 'Rang inchangé'
      }
    >
      {label}
    </span>
  )
}
