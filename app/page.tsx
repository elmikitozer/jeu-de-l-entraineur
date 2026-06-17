import Link from 'next/link'
import { getLeaderboard, getUpcomingMatches, getLiveMatches, getLatestRecap } from '@/lib/queries'
import PodiumCard from '@/components/PodiumCard'
import MatchCard from '@/components/MatchCard'
import LiveMatchCard from '@/components/LiveMatchCard'
import PelouseBackground from '@/components/PelouseBackground'
import LeaderboardTableAnimated from '@/components/LeaderboardTableAnimated'
import RealtimeRefresh from '@/components/RealtimeRefresh'
import ShareButton from '@/components/ShareButton'
import RecapShare from '@/components/RecapShare'
import RecapBody from '@/components/RecapBody'
import { formatRecapDate } from '@/lib/datetime'

export const revalidate = 60

export default async function LeaderboardPage() {
  const [leaderboard, upcoming, live, recap] = await Promise.all([
    getLeaderboard(),
    getUpcomingMatches(5),
    getLiveMatches(),
    getLatestRecap(),
  ])

  const top3 = leaderboard.slice(0, 3)
  const rest = leaderboard.slice(3)

  const totalParticipants = leaderboard.length
  const totalPrize = totalParticipants * 20
  const maxPoints = leaderboard[0]?.total_points || 1

  const empty = leaderboard.length === 0

  return (
    <>
      <PelouseBackground />
      <RealtimeRefresh />

      <div className="relative z-10 max-w-[1280px] mx-auto px-6 md:px-12 pb-16">

        {/* ── Hero : la chronique du jour (above the fold) ── */}
        <div className="pt-10 md:pt-[42px] flex flex-col md:flex-row md:justify-between gap-6 md:gap-10">
          <div className="min-w-0 flex-1 md:max-w-[820px]">
            {recap ? (
              <>
                <h1 className="font-display font-bold italic uppercase text-[27px] md:text-[42px] leading-[1.03] tracking-[0.01em]">
                  <span style={{ color: 'var(--c-lime)' }}>La chronique du jour</span>
                  <span style={{ color: 'var(--c-sub)' }}> · {formatRecapDate(recap.date)}</span>
                </h1>
                <div
                  className="mt-4 rounded-2xl px-5 md:px-7 py-5"
                  style={{
                    background: 'var(--c-card-overlay)',
                    border: '1px solid var(--c-card-border)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                  }}
                >
                  <RecapBody content={recap.content} />
                </div>
                <div className="mt-3.5">
                  <RecapShare text={recap.content} />
                </div>
              </>
            ) : (
              <>
                <p className="text-[13px] font-bold font-body tracking-[0.18em] uppercase" style={{ color: 'var(--c-lime)' }}>
                  Coupe du Monde 2026
                  {totalParticipants > 0 && ` · ${totalParticipants} participants`}
                </p>
                <h1 className="mt-2 font-display font-bold italic uppercase text-[48px] md:text-[68px] leading-none tracking-[0.01em] text-white">
                  Classement<br />général
                </h1>
                {!empty && (
                  <div className="mt-4">
                    <ShareButton />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Cagnotte (coin supérieur droit, inchangé) */}
          <div
            className="rounded-2xl px-7 py-4 text-center self-start text-white flex-shrink-0"
            style={{
              background: 'var(--c-card-overlay)',
              border: '1px solid var(--c-card-border)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <div className="font-display font-bold italic text-[42px] leading-none">
              {totalPrize} €
            </div>
            <div
              className="text-[11px] font-bold font-body tracking-[0.16em] uppercase mt-1"
              style={{ color: 'var(--c-sub)' }}
            >
              Cagnotte
            </div>
          </div>
        </div>

        {empty ? (
          <div className="mt-24 text-center">
            <p className="text-[18px] font-body" style={{ color: 'var(--c-sub)' }}>
              La compétition n&apos;a pas encore commencé.
            </p>
          </div>
        ) : (
          <section className="mt-12 md:mt-16">
            {/* Titre classement (quand la chronique occupe le hero) */}
            {recap && (
              <div className="mb-6">
                <p className="text-[13px] font-bold font-body tracking-[0.18em] uppercase" style={{ color: 'var(--c-lime)' }}>
                  Coupe du Monde 2026
                  {totalParticipants > 0 && ` · ${totalParticipants} participants`}
                </p>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <h2 className="font-display font-bold italic uppercase text-[40px] md:text-[56px] leading-none tracking-[0.01em] text-white">
                    Classement général
                  </h2>
                  <div className="flex-shrink-0 pb-1">
                    <ShareButton />
                  </div>
                </div>
              </div>
            )}

            {/* ── Podium ── */}
            {top3.length >= 1 && (
              <div>
                {/* Mobile : colonne, ordre 1-2-3 */}
                <div className="flex flex-col gap-4 md:hidden">
                  {[top3[0], top3[1], top3[2]].filter(Boolean).map((e, i) => (
                    <Link key={e.id} href={`/equipes/${e.id}`}>
                      <PodiumCard entry={e} place={([1, 2, 3] as const)[i]} />
                    </Link>
                  ))}
                </div>
                {/* Desktop : 2-1-3 */}
                <div className="hidden md:flex gap-4 items-stretch">
                  {top3[1] && (
                    <Link href={`/equipes/${top3[1].id}`} style={{ flex: 1 }}>
                      <PodiumCard entry={top3[1]} place={2} />
                    </Link>
                  )}
                  {top3[0] && (
                    <Link href={`/equipes/${top3[0].id}`} style={{ flex: 1.15 }}>
                      <PodiumCard entry={top3[0]} place={1} />
                    </Link>
                  )}
                  {top3[2] && (
                    <Link href={`/equipes/${top3[2].id}`} style={{ flex: 1 }}>
                      <PodiumCard entry={top3[2]} place={3} />
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* ── Tableau classement (scroll-driven) ── */}
            {rest.length > 0 && (
              <div className="mt-8">
                <LeaderboardTableAnimated rest={rest} maxPoints={maxPoints} />
              </div>
            )}
          </section>
        )}

        {/* ── Matchs en cours ── */}
        {live.length > 0 && (
          <div className="mt-9">
            <div className="flex items-baseline gap-4 mb-3.5">
              <h2 className="font-display font-bold italic text-[28px] uppercase tracking-[0.02em]" style={{ color: '#EF4444' }}>
                En ce moment
              </h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-3.5">
              {live.map((match) => (
                <Link key={match.id} href={`/matches/${match.id}`} className="flex-1 min-w-0 flex">
                  <LiveMatchCard match={match} />
                </Link>
              ))}
            </div>
          </div>
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
                style={{ color: 'var(--c-sub)' }}
              >
                Tous les matchs →
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row gap-3.5">
              {upcoming.map((match, i) => (
                <MatchCard key={match.id} match={match} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
