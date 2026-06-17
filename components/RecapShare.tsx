'use client'

import { useState } from 'react'

/**
 * Partage la chronique du jour via Web Share API (texte). Sur iPhone → feuille
 * de partage native → WhatsApp. Fallback : copie dans le presse-papiers.
 */
export default function RecapShare({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function onShare() {
    const shareData = { title: "Jeu de l'Entraîneur — La chronique du jour", text }
    try {
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData)
        return
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // annulation utilisateur ou erreur : silencieux
    }
  }

  return (
    <button
      onClick={onShare}
      aria-label="Partager la chronique"
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold font-body transition-opacity hover:opacity-80"
      style={{ background: 'var(--c-lime)', color: '#07261B' }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
      {copied ? 'Copié' : 'Partager'}
    </button>
  )
}
