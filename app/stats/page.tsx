import Link from 'next/link'
import { getGlobalStats } from '@/lib/queries'
import Avatar from '@/components/Avatar'
import TriStripe from '@/components/TriStripe'
import Flag from '@/components/Flag'
import { TEAM_NAME_FR } from '@/lib/flags'

export const revalidate = 60

export default async function StatsPage() {
  const stats = await getGlobalStats()

  const { totalPrize, prizeFirst, prizeSecond, prizeThird, topScorers, topAssists, mostRentable, mostRegular, totalParticipants } = stats

  const empty = totalParticipants === 0

  return (
    <div className="max-w-[1280px] mx-auto px-6 md:px-12 pb-16">
      <div className="pt-10">
        <h1 className="font-display font-bold text-[48px] md:text-[68px] uppercase leading-none tracking-[0.01em] text-ink">
          Stats<br />& Cagnotte
        </h1>
        <p className="mt-3 text-[15px] text-sub font-body">
          Coupe du Monde 2026
        </p>
      </div>

      {empty ? (
        <div className="mt-24 text-center">
          <p className="text-[18px] font-body text-sub">
            La compétition n&apos;a pas encore commencé.
          </p>
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-8">

          {/* ── Cagnotte tracker ── */}
          <div className="bg-card border border-line rounded-2xl p-6 md:p-8">
            <div className="flex items-baseline gap-4 mb-6">
              <h2 className="font-display font-bold text-[26px] uppercase tracking-[0.04em] text-ink">
                Cagnotte
              </h2>
              <span className="font-display font-bold italic text-[42px] text-ink leading-none">
                {totalPrize} €
              </span>
            </div>

            <TriStripe height={4} />

            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              {[
                { label: '🥇 1ᵉʳ prix', amount: prizeFirst, pct: 60, color: 'var(--c-podium1)' },
                { label: '🥈 2ᵉ prix', amount: prizeSecond, pct: 30, color: 'var(--c-podium2)' },
                { label: '🥉 3ᵉ prix', amount: prizeThird, pct: 10, color: 'var(--c-podium3)' },
              ].map(({ label, amount, pct, color }) => (
                <div key={label} className="flex-1 flex flex-col gap-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[13px] font-semibold font-body text-ink">{label}</span>
                    <span className="font-display font-bold italic text-[26px] text-ink">{amount} €</span>
                  </div>
                  <div className="h-2 bg-line rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                  <span className="text-[11px] font-body text-sub text-right">{pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Grille stats ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Top buteurs */}
            <StatCard title="Top 5 buteurs">
              {topScorers.length === 0 ? (
                <EmptyState />
              ) : (
                topScorers.map((s, i) => (
                  <StatRow
                    key={s.player.id}
                    rank={i + 1}
                    href={`/player/${s.player.id}`}
                    name={s.player.name}
                    sub={<PlayerSub nationality={s.player.nationality} position={s.player.position} />}
                    value={`${s.count} but${s.count > 1 ? 's' : ''}`}
                    color="var(--c-green)"
                  />
                ))
              )}
            </StatCard>

            {/* Top passeurs */}
            <StatCard title="Top 5 passeurs">
              {topAssists.length === 0 ? (
                <EmptyState />
              ) : (
                topAssists.map((s, i) => (
                  <StatRow
                    key={s.player.id}
                    rank={i + 1}
                    href={`/player/${s.player.id}`}
                    name={s.player.name}
                    sub={<PlayerSub nationality={s.player.nationality} position={s.player.position} />}
                    value={`${s.count} passe${s.count > 1 ? 's' : ''}`}
                    color="var(--c-blue)"
                  />
                ))
              )}
            </StatCard>

            {/* Joueur le plus rentable */}
            <StatCard title="Joueur le plus rentable">
              {mostRentable.length === 0 ? (
                <EmptyState />
              ) : (
                mostRentable.map((s, i) => (
                  <StatRow
                    key={s.player.id}
                    rank={i + 1}
                    href={`/player/${s.player.id}`}
                    name={s.player.name}
                    sub={<PlayerSub nationality={s.player.nationality} extra={`${s.matchCount} match${s.matchCount > 1 ? 's' : ''}`} />}
                    value={`${s.avg} pts/m`}
                    color="var(--c-red)"
                  />
                ))
              )}
            </StatCard>

            {/* Participant le plus régulier */}
            <StatCard title="Participant le plus actif">
              {!mostRegular ? (
                <EmptyState />
              ) : (
                <div className="flex items-center gap-4 p-4">
                  <Avatar name={mostRegular.participant.name} size={52} />
                  <div className="flex-1">
                    <Link
                      href={`/team/${mostRegular.participant.id}`}
                      className="text-[17px] font-bold font-body text-ink hover:text-green transition-colors"
                    >
                      {mostRegular.participant.name}
                    </Link>
                    <p className="text-[12px] text-sub font-body mt-0.5">
                      {mostRegular.matchCount} joueurs avec des points
                    </p>
                  </div>
                  <span className="font-display font-bold italic text-[32px] text-ink">
                    {mostRegular.participant.total_points}
                    <span className="text-[14px] text-sub ml-1">pts</span>
                  </span>
                </div>
              )}
            </StatCard>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sous-composants ──────────────────────────────────────────────────────────

function StatCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-line rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-line">
        <h3 className="font-display font-bold text-[20px] uppercase tracking-[0.04em] text-ink">
          {title}
        </h3>
      </div>
      <div>{children}</div>
    </div>
  )
}

function PlayerSub({ nationality, position, extra }: { nationality: string; position?: string; extra?: string }) {
  const countryFR = TEAM_NAME_FR[nationality] ?? nationality
  return (
    <span className="flex items-center gap-1">
      <Flag teamName={nationality} size="16x12" />
      <span>{countryFR}{position ? ` · ${position}` : ''}{extra ? ` · ${extra}` : ''}</span>
    </span>
  )
}

function StatRow({
  rank,
  href,
  name,
  sub,
  value,
  color,
}: {
  rank: number
  href: string
  name: string
  sub: React.ReactNode
  value: string
  color: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-5 py-3 hover:bg-zebra transition-colors border-b border-line last:border-b-0"
    >
      <span className="font-display font-bold italic text-[22px] text-sub w-6 text-center">
        {rank}
      </span>
      <Avatar name={name} size={34} />
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold font-body text-ink truncate">{name}</div>
        <div className="text-[11px] text-sub font-body">{sub}</div>
      </div>
      <span
        className="font-display font-bold italic text-[18px]"
        style={{ color }}
      >
        {value}
      </span>
    </Link>
  )
}

function EmptyState() {
  return (
    <p className="text-center py-8 text-[13px] text-sub font-body">
      Aucune donnée pour l&apos;instant
    </p>
  )
}
