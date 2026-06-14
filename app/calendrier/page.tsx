import Link from 'next/link'
import { getAllMatches } from '@/lib/queries'
import type { Match } from '@/lib/types'
import LiveBadge from '@/components/LiveBadge'
import Flag from '@/components/Flag'
import LocalTime from '@/components/LocalTime'
import RealtimeRefresh from '@/components/RealtimeRefresh'
import MatchFlashListener from '@/components/MatchFlashListener'
import { TEAM_NAME_FR } from '@/lib/flags'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export const revalidate = 60

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Groupe par jour UTC (clé "yyyy-MM-dd") — les matchs arrivent déjà triés par date ASC. */
function groupByDay(matches: Match[]): { dayKey: string; dayLabel: string; matches: Match[] }[] {
  const map = new Map<string, Match[]>()
  for (const m of matches) {
    const key = m.date.slice(0, 10) // yyyy-MM-dd UTC
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(m)
  }
  return Array.from(map.entries()).map(([key, ms]) => ({
    dayKey: key,
    // Utilise midi UTC pour éviter tout décalage DST
    dayLabel: format(new Date(key + 'T12:00:00Z'), "EEEE d MMMM yyyy", { locale: fr }),
    matches: ms,
  }))
}

/** Raccourcit le label de phase pour le badge discret. */
function shortenStage(stage: string | null): string {
  if (!stage) return ''
  // "Phase de groupes - Groupe A" → "Groupe A"
  const groupMatch = stage.match(/Groupe\s+([A-Z0-9]+)/i)
  if (groupMatch) return `Grp. ${groupMatch[1]}`
  if (stage.includes('16e') || stage.includes('Tour de 32')) return '16e'
  if (stage.includes('Huitième') || stage.includes('huitième')) return '1/8'
  if (stage.includes('Quart')) return '1/4'
  if (stage.includes('Demi')) return '1/2'
  if (stage.includes('Troisième') || stage.includes('3ème') || stage.includes('3e place')) return '3e'
  if (stage.includes('Finale') || stage.includes('finale')) return 'Finale'
  return stage
}

// ── Composants ────────────────────────────────────────────────────────────────

function StageBadge({ stage }: { stage: string | null }) {
  const label = shortenStage(stage)
  if (!label) return null
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-body text-sub bg-zebra border border-line whitespace-nowrap">
      {label}
    </span>
  )
}

/** Chrono d'un match live : "13'" en jeu, "MT" à la mi-temps, rien sinon. */
function liveClock(match: Match): string | null {
  if (match.status_short === 'HT') return 'MT'
  if (match.minute != null) return `${match.minute}'`
  return null
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'live') return <LiveBadge />
  if (status === 'finished') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-green/10 text-green text-[10px] font-bold font-body tracking-wide uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-green" />
        Terminé
      </span>
    )
  }
  return null
}

function MatchTime({ date }: { date: string }) {
  // Affiche HH:mm dans le fuseau du navigateur (unifié avec l'accueil)
  return (
    <LocalTime
      date={date}
      className="text-[12px] font-body font-semibold text-sub tabular-nums"
    />
  )
}

function ScoreDisplay({ match }: { match: Match }) {
  if (match.status === 'live') {
    return (
      <div className="font-display font-bold italic text-[24px] text-red leading-none tabular-nums">
        {match.home_score ?? 0}–{match.away_score ?? 0}
      </div>
    )
  }
  if (match.status === 'finished' && match.home_score !== null) {
    return (
      <div className="font-display font-bold italic text-[24px] text-ink leading-none tabular-nums">
        {match.home_score}–{match.away_score}
      </div>
    )
  }
  return <MatchTime date={match.date} />
}

function TeamCell({ name, align }: { name: string; align: 'left' | 'right' }) {
  const displayName = TEAM_NAME_FR[name] ?? name
  return (
    <div className={`flex items-center gap-2 flex-1 min-w-0 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      <Flag teamName={name} size="24x18" className="flex-shrink-0" />
      <span
        className={`font-display font-bold text-[16px] md:text-[20px] text-ink truncate ${
          align === 'right' ? 'text-right' : 'text-left'
        }`}
      >
        {displayName}
      </span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CalendrierPage() {
  const matches = await getAllMatches()
  const days = groupByDay(matches)

  return (
    <div className="max-w-[860px] mx-auto px-4 md:px-12 pb-16">
      <RealtimeRefresh />
      <MatchFlashListener />
      <div className="pt-10 mb-10">
        <h1 className="font-display font-bold italic uppercase text-[48px] md:text-[68px] leading-none tracking-[0.01em] text-white">
          Matchs
        </h1>
        <p className="mt-2 text-[13px] font-bold font-body tracking-[0.18em] uppercase" style={{ color: 'var(--c-lime)' }}>
          Coupe du Monde 2026 · {matches.length} matchs
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[18px] font-body text-sub">
            Le calendrier n&apos;a pas encore été chargé.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {days.map(({ dayKey, dayLabel, matches: dayMatches }) => (
            <section key={dayKey}>
              {/* Séparateur de journée */}
              <div className="flex items-center gap-3 mb-3">
                <h2
                  className="font-body font-bold text-[12px] uppercase tracking-[0.1em] capitalize"
                  style={{ color: 'var(--c-lime)' }}
                >
                  {dayLabel}
                </h2>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.2)' }} />
                <span className="text-[11px] font-body" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {dayMatches.length} match{dayMatches.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--c-card)', border: '1px solid var(--c-line)', boxShadow: '0 8px 24px rgba(0,40,25,0.18)', color: 'var(--c-ink)' }}>
                {dayMatches.map((match, idx) => {
                  const isLast = idx === dayMatches.length - 1
                  const isLive = match.status === 'live'

                  return (
                    <Link
                      key={match.id}
                      href={`/matches/${match.id}`}
                      data-match-id={match.id}
                      className={[
                        'flex flex-col px-4 py-3 gap-1 transition-colors hover:bg-white/[0.06]',
                        isLive ? 'bg-red/5' : idx % 2 === 0 ? 'bg-card' : 'bg-zebra',
                        !isLast ? 'border-b border-line' : '',
                      ].join(' ')}
                    >
                      {/* Ligne 1 : équipes + score (le score reste seul au centre
                          pour rester aligné verticalement avec les deux équipes) */}
                      <div className="flex items-center gap-3">
                        <TeamCell name={match.home_team} align="right" />

                        <div className="flex items-center justify-center flex-shrink-0 min-w-[60px] md:min-w-[76px]">
                          <ScoreDisplay match={match} />
                        </div>

                        <TeamCell name={match.away_team} align="left" />
                      </div>

                      {/* Ligne 2 : badges phase + statut, centrés sur toute la largeur */}
                      <div className="flex items-center justify-center gap-1.5">
                        <StageBadge stage={match.stage} />
                        {isLive && <StatusBadge status="live" />}
                        {isLive && liveClock(match) && (
                          <span
                            className="text-[11px] font-bold font-body tabular-nums"
                            style={{ color: 'var(--c-lime)' }}
                          >
                            {liveClock(match)}
                          </span>
                        )}
                        {match.status === 'finished' && <StatusBadge status="finished" />}
                      </div>

                      {/* Ligne 3 : stade */}
                      {match.venue && (
                        <div className="text-center">
                          <span
                            className="text-[11px] md:text-[12px] text-sub/70 font-body break-words"
                            title={match.venue}
                          >
                            {match.venue}
                          </span>
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
