'use client'

import { useEffect } from 'react'

/**
 * Scroll automatique à l'ouverture de la liste des matchs vers le match
 * pertinent : match live en cours, sinon dernier match terminé. La cible est
 * calculée côté serveur et passée en prop (null = rester en haut de page).
 *
 * Repère la carte via [data-match-id]. Fallback silencieux si la cible est
 * absente du DOM.
 */
export default function MatchAutoScroll({ targetId }: { targetId: string | null }) {
  useEffect(() => {
    if (!targetId) return
    // Léger délai : laisse le DOM se rendre complètement avant de scroller.
    const t = setTimeout(() => {
      const el = document.querySelector(`[data-match-id="${targetId}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
    return () => clearTimeout(t)
  }, [targetId])

  return null
}
