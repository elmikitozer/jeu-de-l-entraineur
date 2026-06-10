import type { Match } from '@/lib/types'
import { TEAM_NAME_FR, FIFA_CODE } from '@/lib/flags'
import Flag from '@/components/Flag'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Props {
  match: Match
  index: number
}

export default function MatchCard({ match }: Props) {
  const dateObj = new Date(match.date)
  const dateStr = format(dateObj, 'd MMM', { locale: fr })
  const timeStr = format(dateObj, 'HH:mm')

  return (
    <div
      className="flex-1 min-w-0 flex flex-col gap-2.5 p-3.5 rounded-xl"
      style={{
        background: 'var(--c-card-overlay)',
        border: '1px solid var(--c-card-border)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        color: '#ffffff',
        borderRadius: 14,
      }}
    >
      {/* Ligne 1 : phase + date */}
      <div className="flex justify-between text-[11px]" style={{ opacity: 0.85 }}>
        <span className="font-bold tracking-[0.1em] uppercase">
          {match.stage ?? 'Groupe'}
        </span>
        <span>{dateStr}</span>
      </div>

      {/* Ligne 2 : équipes + heure pill lime */}
      <div className="flex items-center justify-center gap-2.5">
        <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0">
          <span className="block md:hidden font-display font-bold italic text-[20px] text-right truncate">
            {TEAM_NAME_FR[match.home_team] ?? match.home_team}
          </span>
          <span
            className="hidden md:block font-display font-bold italic text-[22px]"
            title={TEAM_NAME_FR[match.home_team] ?? match.home_team}
          >
            {FIFA_CODE[match.home_team] ?? match.home_team.slice(0, 3).toUpperCase()}
          </span>
          <Flag teamName={match.home_team} size="24x18" />
        </div>

        {/* Heure en pill lime */}
        <span
          className="font-body font-bold whitespace-nowrap flex-shrink-0 text-[12px]"
          style={{
            background: 'var(--c-lime)',
            color: 'var(--c-ink)',
            borderRadius: 999,
            padding: '2px 9px',
          }}
        >
          {timeStr}
        </span>

        <div className="flex items-center justify-start gap-1.5 flex-1 min-w-0">
          <Flag teamName={match.away_team} size="24x18" />
          <span className="block md:hidden font-display font-bold italic text-[20px] text-left truncate">
            {TEAM_NAME_FR[match.away_team] ?? match.away_team}
          </span>
          <span
            className="hidden md:block font-display font-bold italic text-[22px]"
            title={TEAM_NAME_FR[match.away_team] ?? match.away_team}
          >
            {FIFA_CODE[match.away_team] ?? match.away_team.slice(0, 3).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Stade */}
      {match.venue && (
        <div
          className="text-[10.5px] text-center line-clamp-2 break-words"
          style={{ opacity: 0.8 }}
          title={match.venue}
        >
          {match.venue}
        </div>
      )}
    </div>
  )
}
