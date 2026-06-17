'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Corps de la chronique du jour : tronqué à 3 lignes par défaut, dépliable.
 * Le bouton « Lire la suite » n'apparaît que si le texte déborde réellement
 * (mesuré côté client en état tronqué).
 */
export default function RecapBody({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      // Mesuré uniquement en état tronqué (scrollHeight > hauteur visible des 3 lignes)
      if (!expanded) setOverflows(el.scrollHeight - el.clientHeight > 2)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [content, expanded])

  const clampStyle = expanded
    ? {}
    : {
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical' as const,
        overflow: 'hidden',
      }

  return (
    <div>
      <p
        ref={ref}
        className="text-[15px] md:text-[16px] font-body leading-relaxed italic"
        style={{ color: 'var(--c-ink)', ...clampStyle }}
      >
        {content}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-bold font-body tracking-[0.02em] uppercase transition-opacity hover:opacity-80"
          style={{ color: 'var(--c-lime)' }}
          aria-expanded={expanded}
        >
          {expanded ? 'Réduire' : 'Lire la suite'}
          <span aria-hidden className="text-[10px]">{expanded ? '▲' : '▼'}</span>
        </button>
      )}
    </div>
  )
}
