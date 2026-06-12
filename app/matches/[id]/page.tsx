import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getMatchDetail } from '@/lib/queries'
import { TEAM_NAME_FR } from '@/lib/flags'
import MatchHero from '@/components/match/MatchHero'
import EventTimeline from '@/components/match/EventTimeline'
import LineupCard from '@/components/match/LineupCard'
import FantasyImpact from '@/components/match/FantasyImpact'
import RealtimeRefresh from '@/components/RealtimeRefresh'

export const revalidate = 60

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const detail = await getMatchDetail(params.id)
  if (!detail) return { title: 'Match introuvable' }
  const home = TEAM_NAME_FR[detail.match.home_team] ?? detail.match.home_team
  const away = TEAM_NAME_FR[detail.match.away_team] ?? detail.match.away_team
  const score =
    detail.match.home_score !== null ? ` ${detail.match.home_score}–${detail.match.away_score}` : ''
  return { title: `${home}${score} ${away} · Jeu de l'Entraîneur` }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display font-bold italic uppercase text-[24px] md:text-[30px] tracking-[0.01em] text-white mb-4">
      {children}
    </h2>
  )
}

export default async function MatchPage({ params }: Props) {
  const detail = await getMatchDetail(params.id)
  if (!detail) notFound()

  const { match, prevId, nextId, home, away, events, fantasy, rankingImpact } = detail
  const isScheduled = match.status === 'scheduled'
  const isFinished = match.status === 'finished'

  return (
    <div className="max-w-[940px] mx-auto px-4 md:px-10 pb-16">
      <RealtimeRefresh />

      {/* Back */}
      <div className="pt-9 mb-6">
        <Link
          href="/calendrier"
          className="inline-flex items-center text-[13px] font-semibold font-body text-sub border border-line bg-card rounded-full px-3.5 py-1.5 hover:text-ink transition-colors"
        >
          ← Tous les matchs
        </Link>
      </div>

      {/* 1. HERO */}
      <MatchHero match={match} />

      {isScheduled ? (
        <div className="mt-10 bg-card border border-line rounded-2xl px-6 py-12 text-center">
          <p className="text-[14px] font-body text-sub">
            Ce match n&apos;a pas encore eu lieu. Compositions, événements et points fantasy
            apparaîtront ici une fois le coup d&apos;envoi donné.
          </p>
        </div>
      ) : (
        <>
          {/* 2. TIMELINE */}
          <section className="mt-10">
            <SectionTitle>Temps forts</SectionTitle>
            <div className="bg-card border border-line rounded-2xl px-4 md:px-8 py-7">
              <EventTimeline events={events} homeTeam={home.team} awayTeam={away.team} />
            </div>
          </section>

          {/* 3. COMPOSITIONS */}
          <section className="mt-10">
            <SectionTitle>Compositions</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LineupCard team={home.team} players={home.lineup} matchId={match.id} />
              <LineupCard team={away.team} players={away.lineup} matchId={match.id} />
            </div>
          </section>

          {/* 4. POINTS FANTASY (si terminé) */}
          {isFinished && (
            <section className="mt-10">
              <SectionTitle>Points fantasy générés</SectionTitle>
              <FantasyImpact fantasy={fantasy} rankingImpact={rankingImpact} />
            </section>
          )}
        </>
      )}

      {/* 6. NAVIGATION */}
      <nav className="mt-12 flex items-center justify-between gap-3">
        {prevId ? (
          <Link
            href={`/matches/${prevId}`}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold font-body text-sub border border-line bg-card rounded-full px-4 py-2 hover:text-ink transition-colors"
          >
            ← Précédent
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold font-body text-sub/40 border border-line/50 rounded-full px-4 py-2 cursor-default">
            ← Précédent
          </span>
        )}

        <Link
          href="/calendrier"
          className="text-[12.5px] font-semibold font-body text-sub hover:text-ink transition-colors"
        >
          Calendrier
        </Link>

        {nextId ? (
          <Link
            href={`/matches/${nextId}`}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold font-body text-sub border border-line bg-card rounded-full px-4 py-2 hover:text-ink transition-colors"
          >
            Suivant →
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold font-body text-sub/40 border border-line/50 rounded-full px-4 py-2 cursor-default">
            Suivant →
          </span>
        )}
      </nav>
    </div>
  )
}
