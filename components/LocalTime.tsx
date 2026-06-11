'use client'

import { useEffect, useState } from 'react'
import { formatMatchTime, formatMatchDate } from '@/lib/datetime'

interface Props {
  date: string
  mode?: 'time' | 'date'
  className?: string
  style?: React.CSSProperties
}

/**
 * Affiche l'heure (ou la date) d'un match dans le fuseau du navigateur.
 *
 * Le rendu serveur utilise UTC ; on corrige côté client après hydratation.
 * suppressHydrationWarning évite l'avertissement de mismatch volontaire.
 */
export default function LocalTime({ date, mode = 'time', className, style }: Props) {
  const fmt = mode === 'time' ? formatMatchTime : formatMatchDate

  // SSR fallback : UTC brut (cohérent et stable), corrigé au mount
  const [value, setValue] = useState(() =>
    mode === 'time' ? date.slice(11, 16) : date.slice(8, 10) + '/' + date.slice(5, 7)
  )

  useEffect(() => {
    setValue(fmt(date))
  }, [date, fmt])

  return (
    <span className={className} style={style} suppressHydrationWarning>
      {value}
    </span>
  )
}
