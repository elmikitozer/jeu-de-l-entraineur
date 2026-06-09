import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getParticipantWithTeam } from '@/lib/queries'
import Avatar from '@/components/Avatar'
import Delta from '@/components/Delta'
import FormationView from '@/components/FormationView'
import LiveBadge from '@/components/LiveBadge'
import TriStripe from '@/components/TriStripe'
import Flag from '@/components/Flag'
import { TEAM_NAME_FR } from '@/lib/flags'

export const revalidate = 60

interface Props {
  params: { participantId: string }
}

const LINE_COLORS: Record<string, string> = {
  Attaque: 'var(--c-red)',
  Milieu: 'var(--c-blue)',
  Défense: 'var(--c-green)',
  Gardien: 'var(--c-sub)',
}

export default async function TeamPage({ params }: Props) {
  const data = await getParticipantWithTeam(params.participantId)

  if (!data) notFound()

  const { participant, rank, delta, lines } = data
  const rankLabel =
    rank === 1 ? '★ 1ᵉʳ au classement' : rank === 2 ? '2ᵉ' : rank === 3 ? '3ᵉ' : `${rank}ᵉ`

  return (
    <div className="max-w-[1280px] mx-auto px-6 md:px-12 pb-16">
      {/* Back */}
      <div className="pt-9 mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-[13px] font-semibold font-body text-sub border border-line bg-card rounded-full px-3.5 py-1.5 hover:text-ink transition-colors"
        >
          ← Classement
        </Link>
      </div>

      {/* ── Header participant ── */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-7">
        <div className="flex items-center gap-5">
          <Avatar name={participant.name} size={76} />
          <div>
            <h1 className="font-display font-bold text-[42px] md:text-[54px] uppercase leading-none text-ink">
              {participant.name}
            </h1>
            <div className="flex flex-wrap gap-2 mt-2.5">
              <span className="bg-green text-white rounded px-2.5 py-1 text-[12px] font-bold font-body tracking-[0.08em]">
                {rankLabel}
              </span>
              <span className="border border-line bg-card rounded px-2.5 py-1 text-[12px] font-bold font-body">
                <Delta delta={delta} />
              </span>
              <span className="border border-line bg-card text-sub rounded px-2.5 py-1 text-[12px] font-semibold font-body">
                Formation 4-3-3
              </span>
            </div>
          </div>
        </div>

        {/* Points totaux */}
        <div className="bg-card border border-line rounded-2xl px-7 py-3.5 text-center self-start md:self-auto">
          <div className="font-display font-bold italic text-[46px] leading-none text-ink">
            {participant.total_points}
          </div>
          <div className="text-[11px] font-bold font-body tracking-[0.14em] text-sub uppercase mt-1">
            Points
          </div>
          <div className="mt-2.5">
            <TriStripe height={4} />
          </div>
        </div>
      </div>

      {/* ── Terrain + Effectif ── */}
      {lines.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[18px] font-body text-sub">
            L&apos;équipe n&apos;a pas encore été saisie.
          </p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Terrain */}
          <div className="flex-1 min-w-0">
            <FormationView lines={lines} />
          </div>

          {/* Effectif sidebar */}
          <div className="w-full lg:w-[380px] flex-shrink-0 flex flex-col gap-3.5">
            {lines
              .filter((l) => ['Attaque', 'Milieu', 'Défense', 'Gardien'].includes(l.label))
              .sort((a, b) => {
                const ORDER = ['Attaque', 'Milieu', 'Défense', 'Gardien']
                return ORDER.indexOf(a.label) - ORDER.indexOf(b.label)
              })
              .map((line) => {
                const subtotal = line.players.reduce((s, p) => s + p.points, 0)
                return (
                  <div
                    key={line.label}
                    className="bg-card border border-line rounded-xl overflow-hidden"
                  >
                    {/* Section header */}
                    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-line">
                      <span
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ background: LINE_COLORS[line.label] }}
                      />
                      <span className="font-display font-bold text-[17px] uppercase tracking-[0.08em] text-ink">
                        {line.label}
                      </span>
                      <span className="ml-auto text-[11.5px] font-semibold font-body text-sub">
                        {subtotal} pts
                      </span>
                    </div>

                    {/* Players */}
                    {line.players.map((player) => (
                      <Link
                        key={player.id}
                        href={`/player/${player.id}`}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-zebra transition-colors border-b border-line last:border-b-0"
                      >
                        <Avatar name={player.name} size={34} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold font-body text-ink truncate">
                              {player.name}
                            </span>
                            {player.isLive && <LiveBadge small />}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Flag teamName={player.nationality} size="16x12" />
                            <span className="text-[11px] text-sub font-body">
                              {TEAM_NAME_FR[player.nationality] ?? player.nationality}
                            </span>
                          </div>
                        </div>
                        <span className="font-display font-bold italic text-[21px] text-ink">
                          {player.points}
                        </span>
                      </Link>
                    ))}
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
