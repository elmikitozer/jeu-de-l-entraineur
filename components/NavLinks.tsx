'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/', label: 'Classement' },
  { href: '/equipes', label: 'Équipes' },
  { href: '/stats', label: 'Stats' },
  { href: '/calendrier', label: 'Calendrier' },
]

export default function NavLinks() {
  const pathname = usePathname()

  return (
    <div className="hidden md:flex items-center gap-1">
      {NAV_LINKS.map(({ href, label }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className="text-[13.5px] font-semibold font-body px-[15px] py-[7px] rounded-full transition-colors"
            style={
              isActive
                ? { background: 'rgba(255,255,255,0.95)', color: 'var(--c-ink)' }
                : { color: 'rgba(255,255,255,0.85)' }
            }
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
