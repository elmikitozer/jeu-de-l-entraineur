import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getTeamDetail } from '@/lib/queries'
import type { TeamRosterPlayer, TeamMatchEntry, GroupStanding } from '@/lib/queries'
import { TEAM_NAME_FR, FIFA_CODE } from '@/lib/flags'
import Flag from '@/components/Flag'
import PlayerPhoto from '@/components/PlayerPhoto'
import LocalTime from '@/components/LocalTime'
import Countdown from '@/components/Countdown'

export const revalidate = 60

interface Props {
  params: { id: string }
  searchParams: { from?: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const team = await getTeamDetail(params.id)
  if (!team) return { title: 'Équipe introuvable' }
  const fr = TEAM_NAME_FR[team.name] ?? team.name
  return { title: `${fr} · Jeu de l'Entraîneur` }
}

const POSITION_GROUPS: { key: 'GK' | 'DEF' | 'MID' | 'FWD'; label: string }[] = [
  { key: 'GK', label: 'Gardiens' },
  { key: 'DEF', label: 'Défenseurs' },
  { key: 'MID', label: 'Milieux' },
  { key: 'FWD', label: 'Attaquants' },
]

function ResultBadge({ result }: { result: 'win' | 'draw' | 'loss' }) {
  const map = {
    win: { label: 'V', bg: 'var(--c-green)', color: '#07261B' },
    draw: { label: 'N', bg: 'rgba(255,255,255,0.15)', color: 'var(--c-ink)' },
    loss: { label: 'D', bg: 'var(--c-red)', color: '#fff' },
  }[result]
  return (
    <span
      className="inline-flex items-center justify-center font-display font-bold italic text-[13px] rounded"
      style={{ background: map.bg, color: map.color, width: 22, height: 22 }}
    >
      {map.label}
    </span>
  )
}

function RosterPlayerRow({ player }: { player: TeamRosterPlayer }) {
  return (
    <Link
      href={`/players/${player.id}`}
      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-zebra transition-colors"
    >
      <PlayerPhoto name={player.name} photoUrl={player.photo_url} size={34} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold font-body text-[14px] text-ink truncate">{player.name}</span>
          {player.selected && (
            <span
              className="flex-shrink-0 text-[9px] font-bold font-body uppercase tracking-[0.06em] rounded px-1.5 py-[1px]"
              style={{ background: 'var(--c-lime)', color: '#07261B' }}
              title="Sélectionné dans au moins une équipe fantasy"
            >
              Drafté
            </span>
          )}
        </div>
        {player.goals > 0 && (
          <span className="text-[11px] font-body text-sub">⚽ {player.goals} but{player.goals > 1 ? 's' : ''}</span>
        )}
      </div>
      <span
        className={`font-display font-bold italic text-[17px] tabular-nums flex-shrink-0 ${
          player.points > 0 ? 'text-delta-pos' : player.points < 0 ? 'text-delta-neg' : 'text-sub'
        }`}
      >
        {player.points > 0 ? '+' : ''}{player.points}
      </span>
    </Link>
  )
}

function TeamMatchRow({ m }: { m: TeamMatchEntry }) {
  const oppFr = TEAM_NAME_FR[m.opponent] ?? m.opponent
  const isUpcoming = m.status === 'scheduled'
  return (
    <Link
      href={`/matches/${m.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-zebra transition-colors border-b border-line last:border-b-0"
    >
      <span className="text-[11px] font-body text-sub w-12 flex-shrink-0">
        <LocalTime date={m.date} mode="date" />
      </span>
      <span className="text-[10px] font-body text-sub w-7 flex-shrink-0 text-center">
        {m.isHome ? 'dom' : 'ext'}
      </span>
      <Flag teamName={m.opponent} size="24x18" className="flex-shrink-0" />
      <span className="font-semibold font-body text-[14px] text-ink truncate flex-1 min-w-0">{oppFr}</span>

      {isUpcoming ? (
        <Countdown date={m.date} className="flex-shrink-0" />
      ) : (
        <span className="flex items-center gap-2 flex-shrink-0">
          {m.result && <ResultBadge result={m.result} />}
          <span className="font-display font-bold italic text-[18px] text-ink tabular-nums">
            {m.teamScore}–{m.oppScore}
          </span>
          {m.fantasyPoints !== 0 && (
            <span
              className="text-[11px] font-bold font-body rounded px-1.5 py-[2px] tabular-nums"
              style={{ background: 'rgba(200,245,66,0.14)', color: 'var(--c-lime)' }}
              title="Points fantasy générés par la nation sur ce match"
            >
              {m.fantasyPoints > 0 ? '+' : ''}{m.fantasyPoints}
            </span>
          )}
        </span>
      )}
    </Link>
  )
}

function StandingsTable({ standings, fr }: { standings: GroupStanding[]; fr: (s: string) => string }) {
  return (
    <div className="bg-card border border-line rounded-2xl overflow-hidden">
      <div className="grid grid-cols-[20px_1fr_28px_28px_44px_36px] md:grid-cols-[20px_1fr_32px_32px_32px_32px_48px_40px] gap-1 px-4 py-2.5 border-b border-line text-[10px] font-bold font-body tracking-[0.08em] text-sub uppercase">
        <span>#</span>
        <span>Équipe</span>
        <span className="text-center">J</span>
        <span className="text-center hidden md:block">G</span>
        <span className="text-center hidden md:block">N</span>
        <span className="text-center hidden md:block">P</span>
        <span className="text-center">Diff</span>
        <span className="text-right">Pts</span>
      </div>
      {standings.map((s, i) => (
        <Link
          key={s.code}
          href={`/teams/${s.code}`}
          className="grid grid-cols-[20px_1fr_28px_28px_44px_36px] md:grid-cols-[20px_1fr_32px_32px_32px_32px_48px_40px] gap-1 items-center px-4 py-2.5 border-b border-line last:border-b-0 hover:bg-zebra transition-colors"
          style={s.isCurrent ? { background: 'rgba(200,245,66,0.08)' } : undefined}
        >
          <span className="text-[12px] font-body text-sub">{i + 1}</span>
          <span className="flex items-center gap-2 min-w-0">
            <Flag teamName={s.name} size="16x12" className="flex-shrink-0" />
            <span className={`text-[13px] font-body truncate ${s.isCurrent ? 'font-bold text-ink' : 'text-ink'}`}>
              {fr(s.name)}
            </span>
          </span>
          <span className="text-center text-[13px] font-body text-sub tabular-nums">{s.played}</span>
          <span className="text-center text-[13px] font-body text-sub tabular-nums hidden md:block">{s.win}</span>
          <span className="text-center text-[13px] font-body text-sub tabular-nums hidden md:block">{s.draw}</span>
          <span className="text-center text-[13px] font-body text-sub tabular-nums hidden md:block">{s.loss}</span>
          <span className="text-center text-[13px] font-body text-sub tabular-nums">
            {s.gf - s.ga > 0 ? '+' : ''}{s.gf - s.ga}
          </span>
          <span className="text-right font-display font-bold italic text-[18px] text-ink tabular-nums">{s.points}</span>
        </Link>
      ))}
    </div>
  )
}

export default async function TeamPage({ params, searchParams }: Props) {
  const team = await getTeamDetail(params.id)
  if (!team) notFound()

  // Bouton retour contextuel : présent uniquement si on est arrivé depuis un
  // match (?from=/matches/<id>). Depuis la recherche / un lien direct → pas de bouton.
  const from = searchParams.from
  const back =
    from && from.startsWith('/matches/')
      ? { href: from, label: '← Retour au match' }
      : null

  const fr = (s: string) => TEAM_NAME_FR[s] ?? s
  const nameFr = fr(team.name)
  const fifa = FIFA_CODE[team.name] ?? team.name.slice(0, 3).toUpperCase()
  const rankInGroup = team.standings?.findIndex((s) => s.isCurrent) ?? -1
  const totalPlayerPoints = (['GK', 'DEF', 'MID', 'FWD'] as const).reduce(
    (sum, k) => sum + team.roster[k].reduce((s, p) => s + p.points, 0),
    0
  )

  return (
    <div className="max-w-[1100px] mx-auto px-6 md:px-12 pb-16">
      {/* Back contextuel (uniquement depuis un match) */}
      {back && (
        <div className="pt-9 mb-6">
          <Link
            href={back.href}
            className="inline-flex items-center text-[13px] font-semibold font-body text-sub border border-line bg-card rounded-full px-3.5 py-1.5 hover:text-ink transition-colors"
          >
            {back.label}
          </Link>
        </div>
      )}

      {/* 1. HERO */}
      <div className={`flex items-center gap-4 md:gap-6 mb-8 ${back ? '' : 'pt-9'}`}>
        <Flag teamName={team.name} size="40x30" className="flex-shrink-0 !rounded-md shadow-lg" />
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold italic uppercase text-[40px] md:text-[60px] leading-[0.9] text-white">
            {nameFr}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <span className="text-[12px] font-semibold font-body text-sub border border-line bg-card rounded px-2.5 py-1">
              {fifa}
            </span>
            {team.group && (
              <span className="text-[12px] font-semibold font-body text-sub border border-line bg-card rounded px-2.5 py-1">
                Groupe {team.group}
                {rankInGroup >= 0 && ` · ${rankInGroup + 1}ᵉ`}
              </span>
            )}
            <span className="text-[12px] font-semibold font-body text-sub border border-line bg-card rounded px-2.5 py-1">
              {team.playerCount} joueur{team.playerCount > 1 ? 's' : ''} · {team.selectedCount} drafté{team.selectedCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0 hidden sm:block">
          <div className="font-display font-bold italic text-[44px] md:text-[56px] leading-none" style={{ color: 'var(--c-lime)' }}>
            {totalPlayerPoints}
          </div>
          <div className="text-[10px] font-bold font-body tracking-[0.16em] text-sub uppercase mt-0.5">
            pts fantasy
          </div>
        </div>
      </div>

      {/* Classement du groupe */}
      {team.standings && team.standings.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display font-bold italic uppercase text-[22px] md:text-[26px] text-white mb-4">
            Groupe {team.group}
          </h2>
          <StandingsTable standings={team.standings} fr={fr} />
        </section>
      )}

      {/* 2. EFFECTIF */}
      <section className="mb-10">
        <h2 className="font-display font-bold italic uppercase text-[22px] md:text-[26px] text-white mb-4">
          Effectif
        </h2>
        {team.playerCount === 0 ? (
          <p className="text-[14px] font-body text-sub bg-card border border-line rounded-2xl px-5 py-8 text-center">
            Aucun joueur de cette nation dans notre base CdM.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {POSITION_GROUPS.map(({ key, label }) =>
              team.roster[key].length === 0 ? null : (
                <div key={key} className="bg-card border border-line rounded-2xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-line text-[11px] font-bold font-body tracking-[0.1em] text-sub uppercase">
                    {label}
                  </div>
                  <div className="p-1.5">
                    {team.roster[key].map((p) => (
                      <RosterPlayerRow key={p.id} player={p} />
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* 3. MATCHS */}
      <section className="mb-10">
        <h2 className="font-display font-bold italic uppercase text-[22px] md:text-[26px] text-white mb-4">
          Matchs
        </h2>
        {team.matches.length === 0 ? (
          <p className="text-[14px] font-body text-sub bg-card border border-line rounded-2xl px-5 py-8 text-center">
            Aucun match programmé.
          </p>
        ) : (
          <div className="bg-card border border-line rounded-2xl overflow-hidden">
            {team.matches.map((m) => (
              <TeamMatchRow key={m.id} m={m} />
            ))}
          </div>
        )}
      </section>

      {/* 4. STATS */}
      {team.stats.played > 0 && (
        <section>
          <h2 className="font-display font-bold italic uppercase text-[22px] md:text-[26px] text-white mb-4">
            Statistiques
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Matchs joués" value={team.stats.played} />
            <StatCard label="Buts marqués" value={team.stats.goalsFor} />
            <StatCard label="Buts encaissés" value={team.stats.goalsAgainst} />
            <StatCard
              label="Meilleur buteur"
              value={team.stats.topScorer ? `${team.stats.topScorer.goals}` : '—'}
              sub={team.stats.topScorer?.name}
            />
          </div>
        </section>
      )}
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-card border border-line rounded-2xl px-4 py-4 text-center">
      <div className="font-display font-bold italic text-[34px] leading-none text-ink">{value}</div>
      <div className="text-[10px] font-bold font-body tracking-[0.12em] text-sub uppercase mt-1.5">{label}</div>
      {sub && <div className="text-[11px] font-body text-sub mt-1 truncate">{sub}</div>}
    </div>
  )
}
