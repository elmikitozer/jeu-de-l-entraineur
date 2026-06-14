import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getPlayerHistory } from '@/lib/queries'
import PlayerPhoto from '@/components/PlayerPhoto'
import PlayerHistoryClient from '@/components/PlayerHistoryClient'
import Flag from '@/components/Flag'
import { TEAM_NAME_FR } from '@/lib/flags'

export const revalidate = 60

interface Props {
  params: { id: string }
}

const POSITION_LABELS: Record<string, string> = {
  GK: 'Gardien',
  DEF: 'Défenseur',
  MID: 'Milieu',
  FWD: 'Attaquant',
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { player } = await getPlayerHistory(params.id)
  if (!player) return { title: 'Joueur introuvable' }
  return { title: `${player.name} · Jeu de l'Entraîneur` }
}

export default async function PlayerPage({ params }: Props) {
  const { player, teamCode, history, ownership } = await getPlayerHistory(params.id)

  if (!player) notFound()

  const totalPoints = history.reduce((s, e) => s + e.total_points, 0)
  const playedCount = history.filter((e) => e.played).length
  const natFr = TEAM_NAME_FR[player.nationality] ?? player.nationality

  return (
    <div className="max-w-[900px] mx-auto px-6 md:px-12 pb-16">
      {/* Back → page de la nation du joueur */}
      <div className="pt-9 mb-6">
        <Link
          href={teamCode ? `/teams/${teamCode}` : '/'}
          className="inline-flex items-center gap-2 text-[13px] font-semibold font-body text-sub border border-line bg-card rounded-full px-3.5 py-1.5 hover:text-ink transition-colors"
        >
          ← {teamCode ? <Flag teamName={player.nationality} size="16x12" /> : null}
          {teamCode ? natFr : 'Classement'}
        </Link>
      </div>

      {/* ── Bloc identité : photo · infos · points ── */}
      <div className="flex items-center gap-4 md:gap-6 mb-9">
        <PlayerPhoto name={player.name} photoUrl={player.photo_url} size={96} />

        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold italic uppercase text-[34px] md:text-[48px] leading-[0.95] text-white">
            {player.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <Link
              href={teamCode ? `/teams/${teamCode}` : '#'}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold font-body text-sub border border-line bg-card rounded px-2.5 py-1 hover:text-ink transition-colors"
            >
              <Flag teamName={player.nationality} size="16x12" />
              {natFr}
            </Link>
            <span className="text-[12px] font-semibold font-body text-sub border border-line bg-card rounded px-2.5 py-1">
              {POSITION_LABELS[player.position] ?? player.position}
            </span>
          </div>
        </div>

        {/* Points — grand display chartreuse */}
        <div className="text-right flex-shrink-0">
          <div
            className="font-display font-bold italic text-[52px] md:text-[68px] leading-none"
            style={{ color: 'var(--c-lime)' }}
          >
            {totalPoints}
          </div>
          <div className="text-[10px] font-bold font-body tracking-[0.16em] text-sub uppercase mt-0.5">
            pts · {playedCount} match{playedCount > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* ── Taux de sélection (différentiel) ── */}
      <div className="mb-9 bg-card border border-line rounded-2xl px-5 py-4">
        <div className="text-[10px] font-bold font-body tracking-[0.16em] uppercase text-sub mb-2">
          Taux de sélection
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold italic text-[30px]" style={{ color: 'var(--c-lime)' }}>
              {ownership.pct}%
            </span>
            <span className="text-[13px] font-body text-sub">
              {ownership.count}/{ownership.total} coach{ownership.total > 1 ? 's' : ''}
            </span>
          </div>
          {ownership.count === 0 ? (
            <span className="text-[11px] font-bold font-body uppercase tracking-[0.1em]" style={{ color: 'var(--c-lime)' }}>
              Différentiel total
            </span>
          ) : ownership.count === 1 ? (
            <span className="text-[11px] font-bold font-body uppercase tracking-[0.1em] text-sub">
              Pick unique
            </span>
          ) : null}
        </div>
        <p className="mt-2.5 text-[12.5px] font-body text-sub">
          {ownership.count > 0
            ? ownership.participants.join(' · ')
            : 'Aucun coach n’a sélectionné ce joueur.'}
        </p>
      </div>

      {/* ── Évolution + matchs joués (client) ── */}
      <PlayerHistoryClient history={history} />
    </div>
  )
}
