'use client'

import { useEffect, useState } from 'react'

export default function FooterUpdatedAt() {
  const [mins, setMins] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setMins((m) => m + 1), 60_000)
    // Reset à 0 quand Realtime signale une mise à jour
    const onRealtime = () => setMins(0)
    window.addEventListener('je:realtime', onRealtime)
    return () => {
      clearInterval(timer)
      window.removeEventListener('je:realtime', onRealtime)
    }
  }, [])

  return (
    <span className="font-body text-[12px]" style={{ color: 'var(--c-nav-text)' }}>
      {mins === 0
        ? 'Mis à jour il y a moins d\'une minute'
        : `Mis à jour il y a ${mins} min`}
    </span>
  )
}
