import Link from 'next/link'
import { getLeaderboard, getUpcomingMatches } from '@/lib/queries'
import Avatar from '@/components/Avatar'
import Delta from '@/components/Delta'
import PodiumCard from '@/components/PodiumCard'
import MatchCard from '@/components/MatchCard'

export const revalidate = 60

export default async function LeaderboardPage() {
  const [leaderboard, upcoming] = await Promise.all([
    getLeaderboard(),
    getUpcomingMatches(5),
  ])

  const top3 = leaderboard.slice(0, 3)
  const rest = leaderboard.slice(3)

  const totalParticipants = leaderboard.length
  const totalPrize = totalParticipants * 20
  const maxPoints = leaderboard[0]?.total_points || 1

  const empty = leaderboard.length === 0

  return (
    <div className="max-w-[1280px] mx-auto px-6 md:px-12 pb-16">

      {/* ── Hero ── */}
      <div className="pt-10 md:pt-[42px] flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <p
            className="text-[13px] font-bold font-body tracking-[0.18em] uppercase"
            style={{ color: 'var(--c-lime)' }}
          >
            Coupe du Monde 2026
            {totalParticipants > 0 && ` · ${totalParticipants} participants`}
          </p>
          <h1 className="mt-2 font-display font-bold italic uppercase text-[48px] md:text-[68px] leading-none tracking-[0.01em] text-white">
            Classement<br />général
          </h1>
        </div>

        {/* Cagnotte glassmorphism */}
        <div
          className="rounded-2xl px-7 py-4 text-center self-start md:self-auto text-white"
          style={{
            background: 'var(--c-card-overlay)',
            border: '1px solid var(--c-card-border)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
        >
          <div className="font-display font-bold italic text-[42px] leading-none">
            {totalPrize} €
          </div>
          <div
            className="text-[11px] font-bold font-body tracking-[0.16em] uppercase mt-1"
            style={{ opacity: 0.85 }}
          >
            Cagnotte
          </div>
        </div>
      </div>

      {empty ? (
        <div className="mt-24 text-center">
          <p className="text-[18px] font-body text-white/70">
            La compétition n&apos;a pas encore commencé.
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
                  <Link href={`/team/${top3[1].id}`} style={{ flex: 1 }}>
                    <PodiumCard entry={top3[1]} place={2} />
                  </Link>
                )}
                {top3[0] && (
                  <Link href={`/team/${top3[0].id}`} style={{ flex: 1.15 }}>
                    <PodiumCard entry={top3[0]} place={1} />
                  </Link>
                )}
                {top3[2] && (
                  <Link href={`/team/${top3[2].id}`} style={{ flex: 1 }}>
                    <PodiumCard entry={top3[2]} place={3} />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* ── Tableau classement ── */}
          {rest.length > 0 && (
            <div className="mt-8">
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'var(--c-card)',
                  boxShadow: '0 14px 36px rgba(0,40,25,0.25)',
                  color: 'var(--c-ink)',
                }}
              >
                {/* En-tête */}
                <div
                  className="grid px-4 md:px-6 py-3.5 text-[11px] font-bold font-body tracking-[0.12em] uppercase"
                  style={{
                    gridTemplateColumns: '48px 1fr 90px 80px',
                    borderBottom: '1px solid var(--c-line)',
                    color: 'var(--c-sub)',
                  }}
                >
                  <span>#</span>
                  <span>Coach</span>
                  <span className="text-right">Évolution</span>
                  <span className="text-right">Points</span>
                </div>
                {/* Version desktop avec colonne Progression */}
                <div
                  className="hidden md:grid px-6 py-3.5 text-[11px] font-bold font-body tracking-[0.12em] uppercase"
                  style={{
                    gridTemplateColumns: '56px 1fr 220px 130px 100px',
                    borderBottom: '2px solid var(--c-ink)',
                    color: 'var(--c-sub)',
                  }}
                >
                  <span>#</span>
                  <span>Coach</span>
                  <span>Progression</span>
                  <span className="text-right">Évolution</span>
                  <span className="text-right">Points</span>
                </div>

                {rest.map((entry, idx) => (
                  <Link
                    key={entry.id}
                    href={`/team/${entry.id}`}
                    className="hover:opacity-80 transition-opacity"
                  >
                    {/* Mobile : 4 colonnes */}
                    <div
                      className="grid md:hidden items-center px-4 py-3"
                      style={{
                        gridTemplateColumns: '48px 1fr 90px 80px',
                        background: idx % 2 === 0 ? 'var(--c-zebra)' : 'var(--c-card)',
                        borderBottom: idx < rest.length - 1 ? '1px solid var(--c-line)' : 'none',
                      }}
                    >
                      <span className="font-display font-bold italic text-[22px]" style={{ color: 'var(--c-sub)' }}>
                        {entry.rank}
                      </span>
                      <span className="flex items-center gap-3 min-w-0">
                        <Avatar name={entry.name} size={34} />
                        <span className="text-[14px] font-semibold font-body truncate" style={{ color: 'var(--c-ink)' }}>
                          {entry.name}
                        </span>
                      </span>
                      <span className="text-right">
                        <Delta delta={entry.delta} />
                      </span>
                      <span className="text-right font-display font-bold italic text-[24px]" style={{ color: 'var(--c-ink)' }}>
                        {entry.total_points}
                      </span>
                    </div>

                    {/* Desktop : 5 colonnes avec progression */}
                    <div
                      className="hidden md:grid items-center px-6 py-3"
                      style={{
                        gridTemplateColumns: '56px 1fr 220px 130px 100px',
                        background: idx % 2 === 0 ? 'var(--c-zebra)' : 'var(--c-card)',
                        borderBottom: idx < rest.length - 1 ? '1px solid var(--c-line)' : 'none',
                      }}
                    >
                      <span className="font-display font-bold italic text-[22px]" style={{ color: 'var(--c-sub)' }}>
                        {entry.rank}
                      </span>
                      <span className="flex items-center gap-3 min-w-0">
                        <Avatar name={entry.name} size={36} />
                        <span className="text-[15px] font-semibold font-body truncate" style={{ color: 'var(--c-ink)' }}>
                          {entry.name}
                        </span>
                      </span>
                      {/* Barre de progression verte→lime */}
                      <span className="pr-8">
                        <span
                          className="block h-1.5 rounded-full"
                          style={{ background: 'var(--c-line)' }}
                        >
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${Math.round((entry.total_points / maxPoints) * 100)}%`,
                              background: 'linear-gradient(90deg, var(--c-green), var(--c-lime))',
                            }}
                          />
                        </span>
                      </span>
                      <span className="text-right">
                        <Delta delta={entry.delta} />
                      </span>
                      <span className="text-right font-display font-bold italic text-[26px]" style={{ color: 'var(--c-ink)' }}>
                        {entry.total_points}
                      </span>
                    </div>
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
            <h2 className="font-display font-bold italic text-[28px] uppercase tracking-[0.02em] text-white">
              Prochains matchs
            </h2>
            <Link
              href="/calendrier"
              className="text-[12.5px] font-semibold font-body ml-auto"
              style={{ color: 'rgba(255,255,255,0.75)' }}
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
