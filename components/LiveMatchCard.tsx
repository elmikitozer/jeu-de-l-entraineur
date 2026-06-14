import type { Match } from '@/lib/types'
import { TEAM_NAME_FR, FIFA_CODE } from '@/lib/flags'
import Flag from '@/components/Flag'

export default function LiveMatchCard({ match }: { match: Match }) {
  const homeName = TEAM_NAME_FR[match.home_team] ?? match.home_team
  const awayName = TEAM_NAME_FR[match.away_team] ?? match.away_team
  // Chrono live : "13'" en jeu, "MT" à la mi-temps
  const clock = match.status_short === 'HT' ? 'MT' : match.minute != null ? `${match.minute}'` : null

  return (
    <div
      className="flex-1 min-w-0 flex flex-col gap-2.5 p-3.5"
      style={{
        background: 'rgba(224, 36, 94, 0.10)',
        border: '1px solid rgba(239, 68, 68, 0.45)',
        borderRadius: 14,
        color: '#ffffff',
      }}
    >
      {/* Ligne 1 : phase + badge LIVE */}
      <div className="flex justify-between items-center text-[11px]">
        <span className="font-bold tracking-[0.1em] uppercase font-body" style={{ opacity: 0.85 }}>
          {match.stage ?? 'Groupe'}
        </span>
        <span className="flex items-center gap-1.5 font-body font-bold uppercase tracking-[0.1em]" style={{ color: '#EF4444' }}>
          <span className="relative inline-flex w-2 h-2">
            <span className="absolute inset-0 rounded-full" style={{ background: 'rgba(239,68,68,0.5)', animation: 'pulse-ring 1.5s ease-out infinite' }} />
            <span className="absolute inset-0 rounded-full" style={{ background: '#EF4444' }} />
          </span>
          {clock ? `Live · ${clock}` : 'Live'}
        </span>
      </div>

      {/* Ligne 2 : équipes + score */}
      <div className="flex items-center justify-center gap-3">
        <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0">
          <span className="font-display font-bold italic text-[20px] truncate text-right md:hidden">{homeName}</span>
          <span className="hidden md:block font-display font-bold italic text-[22px]" title={homeName}>
            {FIFA_CODE[match.home_team] ?? match.home_team.slice(0, 3).toUpperCase()}
          </span>
          <Flag teamName={match.home_team} size="24x18" />
        </div>

        <span className="font-display font-bold italic text-[26px] leading-none tabular-nums flex-shrink-0">
          {match.home_score ?? 0}–{match.away_score ?? 0}
        </span>

        <div className="flex items-center justify-start gap-1.5 flex-1 min-w-0">
          <Flag teamName={match.away_team} size="24x18" />
          <span className="font-display font-bold italic text-[20px] truncate text-left md:hidden">{awayName}</span>
          <span className="hidden md:block font-display font-bold italic text-[22px]" title={awayName}>
            {FIFA_CODE[match.away_team] ?? match.away_team.slice(0, 3).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Stade */}
      {match.venue && (
        <div className="text-[10.5px] text-center font-body" style={{ opacity: 0.7 }} title={match.venue}>
          {match.venue}
        </div>
      )}
    </div>
  )
}
