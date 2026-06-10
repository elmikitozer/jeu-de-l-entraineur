import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPlayerHistory } from '@/lib/queries'
import Avatar from '@/components/Avatar'
import PlayerHistoryClient from '@/components/PlayerHistoryClient'
import Flag from '@/components/Flag'
import { TEAM_NAME_FR } from '@/lib/flags'

export const revalidate = 60

interface Props {
  params: { playerId: string }
}

const POSITION_LABELS: Record<string, string> = {
  GK: 'Gardien',
  DEF: 'Défenseur',
  MID: 'Milieu',
  FWD: 'Attaquant',
}

export default async function PlayerPage({ params }: Props) {
  const { player, history } = await getPlayerHistory(params.playerId)

  if (!player) notFound()

  const totalPoints = history.reduce((s, e) => s + e.total_points, 0)

  return (
    <div className="max-w-[900px] mx-auto px-6 md:px-12 pb-16">
      {/* Back */}
      <div className="pt-9 mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-[13px] font-semibold font-body text-sub border border-line bg-card rounded-full px-3.5 py-1.5 hover:text-ink transition-colors"
        >
          ← Classement
        </Link>
      </div>

      {/* ── Header joueur ── */}
      <div className="flex items-center gap-5 mb-8">
        <Avatar name={player.name} size={72} />
        <div>
          <h1 className="font-display font-bold italic uppercase text-[40px] md:text-[52px] leading-none text-white">
            {player.name}
          </h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold font-body text-sub border border-line bg-card rounded px-2.5 py-1">
              <Flag teamName={player.nationality} size="16x12" />
              {TEAM_NAME_FR[player.nationality] ?? player.nationality}
            </span>
            <span className="text-[12px] font-semibold font-body text-sub border border-line bg-card rounded px-2.5 py-1">
              {POSITION_LABELS[player.position] ?? player.position}
            </span>
            <span className="text-[12px] font-bold font-body bg-card border border-line rounded px-2.5 py-1">
              <span className="font-display font-bold italic text-[18px] text-ink">{totalPoints}</span>
              <span className="text-sub ml-1">pts au total</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Historique + graphe (client) ── */}
      <PlayerHistoryClient history={history} />
    </div>
  )
}
