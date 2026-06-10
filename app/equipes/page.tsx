import Link from 'next/link'
import { getAllParticipantsWithTeams } from '@/lib/queries'
import type { ParticipantOverview, SlotEntry } from '@/lib/queries'
import Avatar from '@/components/Avatar'
import JerseySVG from '@/components/JerseySVG'
import { TEAM_COLORS } from '@/lib/flags'

export const revalidate = 60

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_COLORS = { primary: '#5A5A5A', secondary: '#FFFFFF' }

function playerInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function playerDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 11)
  const result = parts[0][0] + '. ' + parts.slice(1).join(' ')
  return result.slice(0, 11)
}

function rankLabel(rank: number): string {
  if (rank === 1) return '1er'
  return `${rank}e`
}

function rankClass(rank: number): string {
  if (rank === 1) return 'bg-podium-1 text-white'
  if (rank === 2) return 'bg-podium-2 text-white'
  if (rank === 3) return 'bg-podium-3 text-white'
  return 'bg-card border border-line text-sub'
}

// Formation : FWD (top) → MID → DEF → GK (bottom)
// Slots : GK=1, DEF=2-5, MID=6-8, FWD=9-11
const ROWS: Array<{ key: string; slots: number[] }> = [
  { key: 'FWD', slots: [9, 10, 11] },
  { key: 'MID', slots: [6, 7, 8] },
  { key: 'DEF', slots: [2, 3, 4, 5] },
  { key: 'GK',  slots: [1] },
]

// ── MiniFormation ─────────────────────────────────────────────────────────────

function MiniFormation({ slots }: { slots: SlotEntry[] }) {
  const slotMap = new Map(slots.map((s) => [s.slot, s]))
  const hasTeam = slots.length > 0

  if (!hasTeam) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          background: '#17452A',
          padding: '16px 10px',
          minHeight: 152,
        }}
      >
        <span className="text-[11px] font-body text-white/30 font-semibold uppercase tracking-widest">
          Équipe non saisie
        </span>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'repeating-linear-gradient(180deg, #1E5C34 0px 38px, #195029 38px 76px)',
        padding: '10px 8px',
      }}
    >
      <div className="flex flex-col gap-1">
        {ROWS.map(({ key, slots: rowSlots }) => (
          <div key={key} className="flex justify-evenly items-end">
            {rowSlots.map((slot) => {
              const entry = slotMap.get(slot)
              if (!entry?.player) {
                // Placeholder vide (slot non rempli)
                return <div key={slot} style={{ width: 36, height: 54 }} />
              }
              const { player, points } = entry
              const colors = TEAM_COLORS[player.nationality] ?? DEFAULT_COLORS
              return (
                <JerseySVG
                  key={slot}
                  primary={colors.primary}
                  secondary={colors.secondary}
                  initials={playerInitials(player.name)}
                  label={playerDisplayName(player.name)}
                  size="sm"
                  title={`${player.name} — ${points} pts`}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── ParticipantCard ───────────────────────────────────────────────────────────

function ParticipantCard({ participant }: { participant: ParticipantOverview }) {
  const { id, name, total_points, rank, slots } = participant

  return (
    <Link
      href={`/team/${id}`}
      className="block bg-card border border-line rounded-2xl overflow-hidden hover:shadow-xl hover:border-ink transition-all duration-200 group"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-line">
        <Avatar name={name} size={44} />
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold uppercase text-[19px] leading-none text-ink truncate group-hover:text-green transition-colors">
            {name}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className={`rounded px-1.5 py-[3px] text-[10px] font-bold font-body tracking-[0.08em] ${rankClass(rank)}`}
            >
              {rankLabel(rank)}
            </span>
            <span className="text-[10.5px] font-semibold font-body text-sub">4‑3‑3</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-display font-bold italic text-[30px] leading-none text-ink">
            {total_points}
          </div>
          <div className="text-[9px] font-bold font-body tracking-[0.14em] text-sub uppercase mt-0.5">
            pts
          </div>
        </div>
      </div>

      {/* Mini terrain + formation */}
      <MiniFormation slots={slots} />
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function EquipesPage() {
  const participants = await getAllParticipantsWithTeams()
  const count = participants.length

  return (
    <div className="max-w-[1280px] mx-auto px-6 md:px-12 pb-16">

      {/* Hero */}
      <div className="pt-10 md:pt-[42px] mb-8 md:mb-10">
        <h1 className="font-display font-bold uppercase text-[48px] md:text-[68px] leading-none tracking-[0.01em] text-ink">
          Toutes les<br />équipes
        </h1>
        <p className="mt-2.5 text-[15px] text-sub font-body">
          {count > 0
            ? `${count} participant${count > 1 ? 's' : ''} · Formation 4‑3‑3 · CdM 2026`
            : 'Coupe du Monde 2026'}
        </p>
      </div>

      {/* État vide */}
      {count === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-[18px] font-body text-sub">
            Les équipes n&apos;ont pas encore été saisies.
          </p>
          <p className="mt-2 text-[14px] text-sub font-body">
            Les compositions seront visibles une fois saisies par l&apos;administrateur.
          </p>
        </div>
      ) : (
        /* Grille responsive : 1 col mobile → 2 col tablet → 3 col desktop */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {participants.map((p) => (
            <ParticipantCard key={p.id} participant={p} />
          ))}
        </div>
      )}
    </div>
  )
}
