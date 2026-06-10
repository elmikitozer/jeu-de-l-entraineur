'use client'

import { useEffect, useState } from 'react'

export default function FooterUpdatedAt() {
  const [mins, setMins] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setMins((m) => m + 1), 60_000)
    return () => clearInterval(timer)
  }, [])

  return (
    <span className="font-body text-[12px]" style={{ color: 'var(--c-nav-text)' }}>
      {mins === 0
        ? 'Mis à jour il y a moins d\'une minute'
        : `Mis à jour il y a ${mins} min`}
    </span>
  )
}
