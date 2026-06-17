import Flag from './Flag'
import { TEAM_NAME_FR } from '@/lib/flags'
import type { TeamLine } from '@/lib/queries'

/**
 * Répartition des joueurs de l'équipe par nationalité (drapeau + pays + nombre),
 * triée par effectif décroissant. Données déjà présentes dans `lines` — aucun
 * appel API. Aide à visualiser la contrainte « max 3 joueurs par nationalité ».
 */
export default function CountryBreakdown({ lines }: { lines: TeamLine[] }) {
  const counts = new Map<string, number>()
  for (const line of lines) {
    for (const p of line.players) {
      counts.set(p.nationality, (counts.get(p.nationality) ?? 0) + 1)
    }
  }

  const sorted = Array.from(counts.entries()).sort(
    (a, b) => b[1] - a[1] || (TEAM_NAME_FR[a[0]] ?? a[0]).localeCompare(TEAM_NAME_FR[b[0]] ?? b[0]),
  )
  if (sorted.length === 0) return null

  return (
    <div className="mt-4 rounded-2xl bg-card border border-line px-4 py-3.5">
      <h2 className="text-[11px] font-bold font-body tracking-[0.14em] uppercase text-sub mb-3">
        Répartition par pays
      </h2>
      <div className="flex flex-wrap gap-x-4 gap-y-2.5">
        {sorted.map(([nat, n]) => (
          <span key={nat} className="inline-flex items-center gap-1.5 text-[13px] font-body">
            <Flag teamName={nat} size="16x12" />
            <span className="font-semibold text-ink">{TEAM_NAME_FR[nat] ?? nat}</span>
            <span className="font-display font-bold italic text-sub">×{n}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
