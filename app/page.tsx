import Link from 'next/link'
import { getLeaderboard, getUpcomingMatches } from '@/lib/queries'
import Avatar from '@/components/Avatar'
import Delta from '@/components/Delta'
import PodiumCard from '@/components/PodiumCard'
import MatchCard from '@/components/MatchCard'
import TriStripe from '@/components/TriStripe'

export const revalidate = 60

const HOST_BADGES = [
  { label: 'MEXIQUE', colorClass: 'text-green border-green' },
  { label: 'ÉTATS-UNIS', colorClass: 'text-blue border-blue' },
  { label: 'CANADA', colorClass: 'text-red border-red' },
]

export default async function LeaderboardPage() {
  const [leaderboard, upcoming] = await Promise.all([
    getLeaderboard(),
    getUpcomingMatches(5),
  ])

  const top3 = leaderboard.slice(0, 3)
  const rest = leaderboard.slice(3)

  const totalParticipants = leaderboard.length
  const totalPrize = totalParticipants * 20

  const empty = leaderboard.length === 0

  return (
    <div className="max-w-[1280px] mx-auto px-6 md:px-12 pb-16">

      {/* ── Hero ── */}
      <div className="pt-10 md:pt-[42px] flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <div className="flex gap-2 items-center flex-wrap">
            {HOST_BADGES.map(({ label, colorClass }) => (
              <span
                key={label}
                className={`text-[11px] font-bold font-body tracking-[0.14em] border-[1.5px] rounded px-2 py-[3px] ${colorClass}`}
              >
                {label}
              </span>
            ))}
          </div>
          <h1 className="mt-3 font-display font-bold uppercase text-[48px] md:text-[68px] leading-none tracking-[0.01em] text-ink">
            Classement<br />général
          </h1>
          <p className="mt-2.5 text-[15px] text-sub font-body">
            Coupe du Monde 2026
            {totalParticipants > 0 && ` · ${totalParticipants} participants`}
          </p>
        </div>

        {/* Cagnotte */}
        <div className="bg-card border border-line rounded-2xl px-7 py-4 text-center self-start md:self-auto">
          <div className="font-display font-bold text-[42px] leading-none text-ink">
            {totalPrize} €
          </div>
          <div className="text-[11px] font-bold font-body tracking-[0.14em] text-sub uppercase mt-1">
            Cagnotte
          </div>
          <div className="mt-2.5">
            <TriStripe height={4} />
          </div>
        </div>
      </div>

      {empty ? (
        <div className="mt-24 text-center">
          <p className="text-[18px] font-body text-sub">
            La compétition n&apos;a pas encore commencé.
          </p>
          <p className="mt-2 text-[14px] text-sub">
            Les équipes seront visibles une fois saisies par l&apos;administrateur.
          </p>
        </div>
      ) : (
        <>
          {/* ── Podium 2-1-3 ── */}
          {top3.length >= 1 && (
            <div className="mt-8">
              {/* Mobile : colonne */}
              <div className="flex flex-col gap-4 md:hidden">
                {[top3[0], top3[1], top3[2]].filter(Boolean).map((e, i) => (
                  <Link key={e.id} href={`/team/${e.id}`}>
                    <PodiumCard entry={e} place={([1, 2, 3] as const)[i]} />
                  </Link>
                ))}
              </div>
              {/* Desktop : 2-1-3 */}
              <div className="hidden md:flex gap-4 items-stretch">
                {top3[1] && (
                  <Link href={`/team/${top3[1].id}`} className="flex-1" style={{ flex: '1' }}>
                    <PodiumCard entry={top3[1]} place={2} />
                  </Link>
                )}
                {top3[0] && (
                  <Link href={`/team/${top3[0].id}`} style={{ flex: '1.2' }}>
                    <PodiumCard entry={top3[0]} place={1} />
                  </Link>
                )}
                {top3[2] && (
                  <Link href={`/team/${top3[2].id}`} className="flex-1" style={{ flex: '1' }}>
                    <PodiumCard entry={top3[2]} place={3} />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* ── Tableau classement ── */}
          {rest.length > 0 && (
            <div className="mt-8">
              <div className="bg-card border border-line rounded-2xl overflow-hidden">
                {/* En-tête */}
                <div className="grid grid-cols-[56px_1fr_130px_90px] md:grid-cols-[64px_1fr_150px_110px] px-4 md:px-7 py-3.5 border-b-2 border-ink text-[11px] font-bold font-body tracking-[0.12em] text-sub uppercase">
                  <span>#</span>
                  <span>Participant</span>
                  <span className="text-right">Évolution</span>
                  <span className="text-right">Points</span>
                </div>

                {rest.map((entry, idx) => (
                  <Link
                    key={entry.id}
                    href={`/team/${entry.id}`}
                    className="grid grid-cols-[56px_1fr_130px_90px] md:grid-cols-[64px_1fr_150px_110px] items-center px-4 md:px-7 py-3 hover:bg-zebra transition-colors"
                    style={{
                      background: idx % 2 === 0 ? 'var(--c-zebra)' : 'var(--c-card)',
                      borderBottom: idx < rest.length - 1 ? '1px solid var(--c-line)' : 'none',
                    }}
                  >
                    <span className="font-display font-bold italic text-[22px] text-sub">
                      {entry.rank}
                    </span>
                    <span className="flex items-center gap-3 min-w-0">
                      <Avatar name={entry.name} size={36} />
                      <span className="text-[15px] font-semibold font-body text-ink truncate">
                        {entry.name}
                      </span>
                    </span>
                    <span className="text-right">
                      <Delta delta={entry.delta} />
                    </span>
                    <span className="text-right font-display font-bold italic text-[26px] text-ink">
                      {entry.total_points}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Prochains matchs ── */}
      {upcoming.length > 0 && (
        <div className="mt-9">
          <div className="flex items-baseline gap-4 mb-3.5">
            <h2 className="font-display font-bold text-[28px] uppercase tracking-[0.02em] text-ink">
              Prochains matchs
            </h2>
            <Link
              href="/calendrier"
              className="text-[12.5px] font-semibold font-body text-sub hover:text-ink transition-colors ml-auto"
            >
              Calendrier complet →
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row gap-3.5 overflow-x-auto">
            {upcoming.map((match, i) => (
              <MatchCard key={match.id} match={match} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
