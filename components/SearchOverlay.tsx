'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Flag from '@/components/Flag'
import Avatar from '@/components/Avatar'
import PlayerPhoto from '@/components/PlayerPhoto'

interface ParticipantHit { id: string; name: string; rank: number; points: number }
interface TeamHit { code: string; name: string; group: string | null }
interface PlayerHit { id: string; name: string; nationality: string; nationalityFr: string; code: string | null; position: string; photo_url: string | null; points: number }
interface MatchHit { id: string; home: string; away: string; homeFr: string; awayFr: string; home_score: number | null; away_score: number | null; date: string; status: string }
interface Results { participants: ParticipantHit[]; teams: TeamHit[]; players: PlayerHit[]; matches: MatchHit[] }

const EMPTY: Results = { participants: [], teams: [], players: [], matches: [] }

const POSITION_LABELS: Record<string, string> = { GK: 'Gardien', DEF: 'Défenseur', MID: 'Milieu', FWD: 'Attaquant' }

function SearchIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

export default function SearchOverlay() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Results>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Liste plate (ordre PARTICIPANTS → ÉQUIPES → JOUEURS → MATCHS) pour la nav clavier
  const flat = useMemo(() => {
    const items: { href: string }[] = []
    results.participants.forEach((p) => items.push({ href: `/equipes/${p.id}` }))
    results.teams.forEach((t) => items.push({ href: `/teams/${t.code}` }))
    results.players.forEach((p) => items.push({ href: `/players/${p.id}` }))
    results.matches.forEach((m) => items.push({ href: `/matches/${m.id}` }))
    return items
  }, [results])

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setResults(EMPTY)
    setActive(0)
  }, [])

  const go = useCallback(
    (href: string) => {
      close()
      router.push(href)
    },
    [close, router]
  )

  // Raccourci global Cmd/Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Focus + lock scroll à l'ouverture
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 40)
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      document.body.style.overflow = ''
    }
  }, [open])

  // Recherche débouncée (200ms, dès 2 caractères)
  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) {
      setResults(EMPTY)
      setLoading(false)
      return
    }
    setLoading(true)
    const ctrl = new AbortController()
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        const data = (await res.json()) as Results
        setResults(data)
        setActive(0)
      } catch {
        /* abort — ignore */
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => {
      clearTimeout(id)
      ctrl.abort('cancelled')
    }
  }, [query, open])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const target = flat[active]
      if (target) go(target.href)
    }
  }

  const hasResults = flat.length > 0
  const showEmpty = query.trim().length >= 2 && !loading && !hasResults

  // Compteur courant pour relier le rendu groupé à l'index plat
  let counter = -1
  const next = () => ++counter
  const rowCls = (i: number) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors ${
      i === active ? 'bg-[rgba(200,245,66,0.12)]' : 'hover:bg-zebra'
    }`

  return (
    <>
      {/* Déclencheur navbar */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Rechercher"
        className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-white/10"
        style={{ color: 'var(--c-nav-text)' }}
      >
        <SearchIcon />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh] md:pt-[14vh]"
          onMouseDown={close}
        >
          {/* Backdrop */}
          <div className="absolute inset-0" style={{ background: 'rgba(3,18,11,0.78)', backdropFilter: 'blur(4px)' }} />

          {/* Palette */}
          <div
            className="relative w-full max-w-[600px] rounded-2xl overflow-hidden shadow-2xl animate-menu-open"
            style={{ background: 'rgba(7,40,24,0.98)', border: '1px solid var(--c-card-border)' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Champ */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-line">
              <span style={{ color: 'var(--c-sub)' }}><SearchIcon size={20} /></span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Participant, équipe, joueur, match…"
                className="flex-1 bg-transparent outline-none text-[16px] font-body text-ink placeholder:text-sub"
              />
              {loading && <span className="text-[11px] font-body text-sub">…</span>}
              <button
                onClick={close}
                className="text-[11px] font-body text-sub border border-line rounded px-1.5 py-0.5 hover:text-ink"
              >
                Esc
              </button>
            </div>

            {/* Résultats */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {query.trim().length < 2 && (
                <p className="text-center text-[13px] font-body text-sub py-8 px-4">
                  Tape au moins 2 caractères pour rechercher.
                </p>
              )}

              {showEmpty && (
                <p className="text-center text-[13px] font-body text-sub py-8 px-4">
                  Aucun résultat pour « {query.trim()} ».
                </p>
              )}

              {/* ① PARTICIPANTS */}
              {results.participants.length > 0 && (
                <Section label="Participants">
                  {results.participants.map((p) => {
                    const i = next()
                    return (
                      <div key={p.id} className={rowCls(i)} onMouseEnter={() => setActive(i)} onClick={() => go(`/equipes/${p.id}`)}>
                        <Avatar name={p.name} size={32} />
                        <span className="flex-1 min-w-0 font-semibold font-body text-[14px] text-ink truncate">{p.name}</span>
                        <span className="text-[11px] font-body text-sub">{p.rank}ᵉ</span>
                        <span className="font-display font-bold italic text-[16px] text-ink tabular-nums">{p.points}</span>
                      </div>
                    )
                  })}
                </Section>
              )}

              {/* ② ÉQUIPES */}
              {results.teams.length > 0 && (
                <Section label="Équipes">
                  {results.teams.map((t) => {
                    const i = next()
                    return (
                      <div key={t.code} className={rowCls(i)} onMouseEnter={() => setActive(i)} onClick={() => go(`/teams/${t.code}`)}>
                        <Flag teamName={t.name} size="24x18" className="flex-shrink-0" />
                        <span className="flex-1 min-w-0 font-semibold font-body text-[14px] text-ink truncate">{t.name}</span>
                        {t.group && <span className="text-[11px] font-body text-sub">Groupe {t.group}</span>}
                      </div>
                    )
                  })}
                </Section>
              )}

              {/* ③ JOUEURS */}
              {results.players.length > 0 && (
                <Section label="Joueurs">
                  {results.players.map((p) => {
                    const i = next()
                    return (
                      <div key={p.id} className={rowCls(i)} onMouseEnter={() => setActive(i)} onClick={() => go(`/players/${p.id}`)}>
                        <PlayerPhoto name={p.name} photoUrl={p.photo_url} size={32} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold font-body text-[14px] text-ink truncate">{p.name}</div>
                          <div className="flex items-center gap-1.5 text-[11px] font-body text-sub">
                            <Flag teamName={p.nationality} size="16x12" />
                            {p.nationalityFr} · {POSITION_LABELS[p.position] ?? p.position}
                          </div>
                        </div>
                        <span className="font-display font-bold italic text-[16px] text-ink tabular-nums">{p.points}</span>
                      </div>
                    )
                  })}
                </Section>
              )}

              {/* ④ MATCHS */}
              {results.matches.length > 0 && (
                <Section label="Matchs">
                  {results.matches.map((m) => {
                    const i = next()
                    const hasScore = m.home_score !== null && m.away_score !== null
                    return (
                      <div key={m.id} className={rowCls(i)} onMouseEnter={() => setActive(i)} onClick={() => go(`/matches/${m.id}`)}>
                        <Flag teamName={m.home} size="16x12" className="flex-shrink-0" />
                        <span className="font-semibold font-body text-[13.5px] text-ink truncate">{m.homeFr}</span>
                        <span className="font-display font-bold italic text-[14px] text-sub tabular-nums flex-shrink-0">
                          {hasScore ? `${m.home_score}–${m.away_score}` : 'vs'}
                        </span>
                        <span className="font-semibold font-body text-[13.5px] text-ink truncate">{m.awayFr}</span>
                        <Flag teamName={m.away} size="16x12" className="flex-shrink-0" />
                      </div>
                    )
                  })}
                </Section>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="px-3.5 pt-2 pb-1 text-[10px] font-bold font-body tracking-[0.14em] uppercase" style={{ color: 'var(--c-lime)' }}>
        {label}
      </div>
      {children}
    </div>
  )
}
