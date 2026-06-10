import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getParticipantWithTeam } from '@/lib/queries'
import Avatar from '@/components/Avatar'
import Delta from '@/components/Delta'
import FormationView from '@/components/FormationView'
import RosterSidebar from '@/components/RosterSidebar'
import TriStripe from '@/components/TriStripe'
import TeamsLocked from '@/components/TeamsLocked'

export const revalidate = 60

interface Props {
  params: { participantId: string }
}

export default async function TeamPage({ params }: Props) {
  if (process.env.TEAMS_VISIBLE !== 'true') {
    return (
      <div className="max-w-[860px] mx-auto px-4 md:px-12">
        <div className="pt-10 mb-2">
          <h1 className="font-display font-bold uppercase text-[48px] md:text-[68px] leading-none tracking-[0.01em] text-ink">
            Équipe
          </h1>
        </div>
        <TeamsLocked />
      </div>
    )
  }

  const data = await getParticipantWithTeam(params.participantId)

  if (!data) notFound()

  const { participant, rank, delta, lines } = data
  const rankLabel =
    rank === 1 ? '★ 1ᵉʳ' : rank === 2 ? '2ᵉ' : rank === 3 ? '3ᵉ' : `${rank}ᵉ`

  return (
    <div className="max-w-[1280px] mx-auto px-6 md:px-12 pb-16">

      {/* ── Fix 1 : Bouton retour — sticky sur mobile, statique desktop ── */}
      <div className="sticky top-16 z-30 md:static bg-bg pt-4 pb-2 md:pt-9 md:pb-0 md:mb-6">
        <Link
          href="/equipes"
          className="inline-flex items-center text-[13px] font-semibold font-body text-sub border border-line bg-card rounded-full px-3.5 py-1.5 hover:text-ink transition-colors"
        >
          ← Toutes les équipes
        </Link>
      </div>

      {/* ── Header participant — Mobile : colonne centrée, Desktop : ligne ── */}

      {/* Mobile header */}
      <div className="md:hidden flex flex-col items-center gap-3 mb-6 text-center pt-2">
        <Avatar name={participant.name} size={64} />
        <h1 className="font-display font-bold text-[38px] uppercase leading-none text-ink">
          {participant.name}
        </h1>
        {/* Points intégrés dans le header mobile */}
        <div className="font-display font-bold italic text-[56px] leading-none text-ink">
          {participant.total_points}
          <span className="font-body font-semibold not-italic text-[16px] text-sub ml-2">pts</span>
        </div>
        {/* Fix 2 : pas de badge "Formation 4-3-3" */}
        <div className="flex gap-2 justify-center">
          <span className="bg-green text-white rounded px-2.5 py-1 text-[12px] font-bold font-body tracking-[0.08em]">
            {rankLabel}
          </span>
          <span className="border border-line bg-card rounded px-2.5 py-1 text-[12px] font-bold font-body">
            <Delta delta={delta} />
          </span>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden md:flex md:flex-row md:items-end md:justify-between gap-6 mb-7">
        <div className="flex items-center gap-5">
          <Avatar name={participant.name} size={76} />
          <div>
            <h1 className="font-display font-bold text-[54px] uppercase leading-none text-ink">
              {participant.name}
            </h1>
            {/* Fix 2 : badges rang + delta uniquement, pas "Formation 4-3-3" */}
            <div className="flex flex-wrap gap-2 mt-2.5">
              <span className="bg-green text-white rounded px-2.5 py-1 text-[12px] font-bold font-body tracking-[0.08em]">
                {rankLabel}
              </span>
              <span className="border border-line bg-card rounded px-2.5 py-1 text-[12px] font-bold font-body">
                <Delta delta={delta} />
              </span>
            </div>
          </div>
        </div>

        {/* Points totaux desktop */}
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
          <div className="flex-1 min-w-0 w-full">
            <FormationView lines={lines} />
          </div>

          {/* Effectif — accordéon mobile, sidebar desktop */}
          <RosterSidebar lines={lines} />
        </div>
      )}
    </div>
  )
}
