'use client'

import { useEffect } from 'react'

/**
 * Écoute les événements je:realtime et applique un flash chartreuse discret
 * sur la carte du match qui vient de changer (identifiée par data-match-id).
 * Respecte prefers-reduced-motion via CSS (la classe .match-flash ne s'anime
 * que si la préférence n'est pas "reduce").
 */
export default function MatchFlashListener() {
  useEffect(() => {
    const onRealtime = (e: Event) => {
      const matchId = (e as CustomEvent<{ matchId?: string }>).detail?.matchId
      if (!matchId) return
      const el = document.querySelector(`[data-match-id="${matchId}"]`)
      if (!el) return
      el.classList.remove('match-flash')
      // Force reflow pour que l'animation rejoue si elle est déjà active
      void (el as HTMLElement).offsetWidth
      el.classList.add('match-flash')
      el.addEventListener('animationend', () => el.classList.remove('match-flash'), { once: true })
    }

    window.addEventListener('je:realtime', onRealtime)
    return () => window.removeEventListener('je:realtime', onRealtime)
  }, [])

  return null
}
