import type { Match } from '@/lib/types'
import { TEAM_NAME_FR, FIFA_CODE } from '@/lib/flags'
import Flag from '@/components/Flag'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Props {
  match: Match
  index: number
}

const ACCENT_COLORS = ['var(--c-green)', 'var(--c-blue)', 'var(--c-red)']

export default function MatchCard({ match, index }: Props) {
  const color = ACCENT_COLORS[index % 3]
  const dateObj = new Date(match.date)
  const dateStr = format(dateObj, 'd MMM', { locale: fr })
  const timeStr = format(dateObj, 'HH:mm')

  return (
    <div
      className="flex-1 min-w-0 bg-card border border-line rounded-xl flex flex-col gap-2.5 p-3.5"
      style={{ borderTop: `4px solid ${color}` }}
    >
      <div className="flex justify-between text-[11px] text-sub">
        <span
          className="font-bold tracking-widest uppercase"
          style={{ color }}
        >
          {match.stage ?? 'Groupe'}
        </span>
        <span>{dateStr}</span>
      </div>

      <div className="flex items-center justify-center gap-2.5">
        <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0">
          <span className="block md:hidden font-display font-bold text-[20px] text-ink text-right truncate">
            {TEAM_NAME_FR[match.home_team] ?? match.home_team}
          </span>
          <span
            className="hidden md:block font-display font-bold text-[18px] text-ink"
            title={TEAM_NAME_FR[match.home_team] ?? match.home_team}
          >
            {FIFA_CODE[match.home_team] ?? match.home_team.slice(0, 3).toUpperCase()}
          </span>
          <Flag teamName={match.home_team} size="24x18" />
        </div>
        <span className="text-[11px] font-bold text-sub whitespace-nowrap flex-shrink-0">{timeStr}</span>
        <div className="flex items-center justify-start gap-1.5 flex-1 min-w-0">
          <Flag teamName={match.away_team} size="24x18" />
          <span className="block md:hidden font-display font-bold text-[20px] text-ink text-left truncate">
            {TEAM_NAME_FR[match.away_team] ?? match.away_team}
          </span>
          <span
            className="hidden md:block font-display font-bold text-[18px] text-ink"
            title={TEAM_NAME_FR[match.away_team] ?? match.away_team}
          >
            {FIFA_CODE[match.away_team] ?? match.away_team.slice(0, 3).toUpperCase()}
          </span>
        </div>
      </div>

      {match.venue && (
        <div
          className="text-[11px] md:text-[12px] text-sub text-center line-clamp-2 break-words"
          title={match.venue}
        >
          {match.venue}
        </div>
      )}
    </div>
  )
}
