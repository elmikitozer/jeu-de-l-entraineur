'use client'

import { useState } from 'react'

/**
 * Partage le classement du soir en un tap. Récupère le PNG généré par
 * /api/og/classement et le passe à l'API Web Share (niveau 2, fichiers) → sur
 * iPhone, feuille de partage native → WhatsApp, image fraîche à chaque fois (pas
 * de cache OG à contourner). Fallback : ouverture de l'image dans un onglet.
 */
export default function ShareButton() {
  const [busy, setBusy] = useState(false)

  async function onShare() {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/og/classement', { cache: 'no-store' })
      if (!res.ok) throw new Error('og fetch failed')
      const blob = await res.blob()
      const file = new File([blob], 'classement.png', { type: 'image/png' })

      if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Classement · Jeu de l'Entraîneur",
          text: 'Le classement du soir 🏆',
        })
      } else {
        window.open(URL.createObjectURL(blob), '_blank')
      }
    } catch {
      // Annulation utilisateur (AbortError) ou erreur réseau : silencieux.
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={onShare}
      disabled={busy}
      aria-label="Partager le classement"
      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold font-body transition-opacity disabled:opacity-60"
      style={{ background: 'var(--c-lime)', color: '#07261B' }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
      {busy ? 'Préparation…' : 'Partager'}
    </button>
  )
}
