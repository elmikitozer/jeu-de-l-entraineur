'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

const NAV_LINKS = [
  { href: '/', label: 'Classement' },
  { href: '/equipes', label: 'Équipes' },
  { href: '/stats', label: 'Stats' },
  { href: '/calendrier', label: 'Matchs' },
  { href: '/regles', label: 'Règles' },
]

export default function MobileMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  return (
    <div ref={ref} className="md:hidden">
      {/* Burger / croix */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        className="w-11 h-11 flex items-center justify-center rounded-lg transition-colors"
        style={{ color: 'var(--c-nav-text)' }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>

      {/* Dropdown — absolute positionné depuis le <header sticky> (containing block)
          top-full = 100% de la hauteur du header = juste sous la TriStripe
          left-0 right-0 = pleine largeur viewport */}
      {open && (
        <div
          className="absolute left-0 right-0 top-full z-40 shadow-xl animate-menu-open"
          style={{
            background: 'rgba(7, 40, 24, 0.98)',
            borderBottom: '1px solid var(--c-nav-border)',
          }}
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center px-6 py-4 text-[16px] font-semibold font-body transition-colors border-b last:border-b-0"
              style={{ color: 'var(--c-nav-text-strong)', borderColor: 'rgba(255,255,255,0.08)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
