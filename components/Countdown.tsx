'use client'

import { useEffect, useState } from 'react'
import { parseMatchDateUTC } from '@/lib/datetime'

interface Props {
  date: string
  className?: string
}

function format(target: Date, now: Date): string {
  const diff = target.getTime() - now.getTime()
  if (diff <= 0) return 'En cours'
  const mins = Math.floor(diff / 60000)
  const days = Math.floor(mins / 1440)
  const hours = Math.floor((mins % 1440) / 60)
  const minutes = mins % 60
  if (days > 0) return `J‑${days}`
  if (hours > 0) return `${hours}h ${minutes}min`
  return `${minutes}min`
}

/** Compte à rebours léger jusqu'au coup d'envoi d'un match à venir. */
export default function Countdown({ date, className }: Props) {
  const target = parseMatchDateUTC(date)
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    const tick = () => setLabel(format(target, new Date()))
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [date]) // eslint-disable-line react-hooks/exhaustive-deps

  // Rien au SSR (dépend de l'heure courante) — apparaît après hydratation
  if (!label) return null

  return (
    <span
      className={className}
      style={{
        background: 'var(--c-lime)',
        color: '#07261B',
        borderRadius: 999,
        padding: '2px 9px',
        fontWeight: 700,
        fontSize: 11,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}
