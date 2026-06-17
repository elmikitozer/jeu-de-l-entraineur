import Link from 'next/link'
import type { ParticipantMatch, ParticipantMatchesData } from '@/lib/queries'
import { TEAM_NAME_FR } from '@/lib/flags'
import Flag from '@/components/Flag'
import LocalTime from '@/components/LocalTime'

/** "Kylian Mbappé" → "K. Mbappé" pour rester compact. */
function shortName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return parts[0][0] + '. ' + parts.slice(1).join(' ')
}

function PointsTag({ points }: { points: number }) {
  const color = points > 0 ? 'var(--c-lime)' : points < 0 ? '#EF4444' : 'var(--c-sub)'
  return (
    <span className="font-display font-bold italic text-[12px] tabular-nums flex-shrink-0" style={{ color }}>
      {points > 0 ? '+' : ''}{points}
    </span>
  )
}

function TeamSide({ name, align }: { name: string; align: 'left' | 'right' }) {
  return (
    <div className={`flex items-center gap-1.5 flex-1 min-w-0 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      <Flag teamName={name} size="24x18" className="flex-shrink-0" />
      <span className={`font-display font-bold italic text-[16px] md:text-[18px] truncate ${align === 'right' ? 'text-right' : 'text-left'}`}>
        {TEAM_NAME_FR[name] ?? name}
      </span>
    </div>
  )
}

function MatchRow({ m }: { m: ParticipantMatch }) {
  const finished = m.status === 'finished'
  return (
    <Link
      href={`/matches/${m.id}`}
      className="block rounded-[14px] p-[13px_15px] flex flex-col gap-2.5 text-white transition-transform hover:-translate-y-0.5"
      style={{ background: 'rgba(4, 26, 17, 0.55)', border: '1px solid var(--c-card-border)' }}
    >
      {/* Ligne 1 : statut + date */}
      <div className="flex justify-between text-[11px]" style={{ opacity: 0.85 }}>
        <span className="font-bold tracking-[0.1em] uppercase font-body" style={{ color: finished ? 'var(--c-sub)' : 'var(--c-lime)' }}>
          {finished ? 'Terminé' : 'À venir'}
        </span>
        <LocalTime date={m.date} mode="date" className="font-body" />
      </div>

      {/* Ligne 2 : équipes + score/heure */}
      <div className="flex items-center justify-center gap-2.5">
        <TeamSide name={m.home_team} align="right" />
        <span className="flex-shrink-0 flex items-center justify-center min-w-[58px]">
          {finished && m.home_score !== null ? (
            <span className="font-display font-bold italic text-[22px] tabular-nums text-ink">
              {m.home_score}–{m.away_score}
            </span>
          ) : (
            <span
              className="font-body font-bold whitespace-nowrap text-[12px]"
              style={{ background: 'var(--c-lime)', color: '#07261B', borderRadius: 999, padding: '2px 9px' }}
            >
              <LocalTime date={m.date} />
            </span>
          )}
        </span>
        <TeamSide name={m.away_team} align="left" />
      </div>

      {/* Ligne 3 : joueurs de l'équipe fantasy concernés */}
      {m.players.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-2 border-t border-line">
          {m.players.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1 text-[12px] font-body min-w-0">
              <Flag teamName={p.nationality} size="16x12" />
              <span className="font-semibold text-ink truncate">{shortName(p.name)}</span>
              {p.points !== null && <PointsTag points={p.points} />}
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[12px] font-bold font-body tracking-[0.14em] uppercase mb-3" style={{ color: 'var(--c-lime)' }}>
      {children}
    </h3>
  )
}

export default function ParticipantMatches({ recent, upcoming }: ParticipantMatchesData) {
  if (recent.length === 0 && upcoming.length === 0) return null

  return (
    <section className="mt-12">
      <h2 className="font-display font-bold italic uppercase text-[24px] md:text-[30px] tracking-[0.01em] text-white mb-5">
        Mes matchs
      </h2>

      {recent.length > 0 && (
        <div className="mb-8">
          <SubTitle>Derniers matchs</SubTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {recent.map((m) => (
              <MatchRow key={m.id} m={m} />
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <SubTitle>Prochains matchs</SubTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {upcoming.map((m) => (
              <MatchRow key={m.id} m={m} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
