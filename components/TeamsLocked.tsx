'use client'

import { useEffect, useState } from 'react'

const REVEAL_DATE = new Date('2026-06-10T22:00:00Z') // 11 juin 00h00 heure de Paris (UTC+2)

function getTimeLeft() {
  const diff = REVEAL_DATE.getTime() - Date.now()
  if (diff <= 0) return null
  const days    = Math.floor(diff / 86_400_000)
  const hours   = Math.floor((diff % 86_400_000) / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  const seconds = Math.floor((diff % 60_000) / 1_000)
  return { days, hours, minutes, seconds }
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="bg-card border border-line rounded-xl px-4 py-3 min-w-[64px] text-center">
        <span className="font-display font-bold italic text-[36px] leading-none text-ink tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[11px] font-body font-semibold text-sub uppercase tracking-[0.1em]">
        {label}
      </span>
    </div>
  )
}

export default function TeamsLocked() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft)

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center text-center gap-10 py-24 px-6">
      <div className="flex flex-col items-center gap-4">
        <span className="text-[52px] leading-none select-none">🔒</span>
        <h2 className="font-display font-bold text-[28px] md:text-[36px] uppercase leading-none text-ink">
          Les équipes seront<br />révélées à minuit
        </h2>
        <p className="text-[14px] font-body text-sub max-w-[340px]">
          Rendez-vous dans la nuit du 10 au 11 juin 2026 à 00h00 pour découvrir toutes les compositions.
        </p>
      </div>

      {timeLeft ? (
        <div className="flex items-start gap-3 md:gap-4">
          <Unit value={timeLeft.days}    label="Jours" />
          <span className="font-display font-bold text-[28px] text-sub/40 mt-3">:</span>
          <Unit value={timeLeft.hours}   label="Heures" />
          <span className="font-display font-bold text-[28px] text-sub/40 mt-3">:</span>
          <Unit value={timeLeft.minutes} label="Minutes" />
          <span className="font-display font-bold text-[28px] text-sub/40 mt-3">:</span>
          <Unit value={timeLeft.seconds} label="Secondes" />
        </div>
      ) : (
        <p className="text-[16px] font-body font-semibold text-green">
          C&apos;est l&apos;heure ! Les équipes sont révélées — rechargez la page.
        </p>
      )}
    </div>
  )
}
