/**
 * team-names.ts — Réaligne un nom d'équipe venu d'une source externe sur le nom
 * canonique de la base.
 *
 * FIFA, API-Football, ESPN et notre base divergent sur plusieurs nations
 * ("Côte d'Ivoire" / "Ivory Coast" / "Cabo Verde", "Korea Republic" /
 * "South Korea", "IR Iran" / "Iran"...). Écrire tel quel le nom d'une source
 * casserait applyAbsentTeamResultBonus, qui retrouve les sélections en
 * comparant matches.home_team à players.nationality.
 *
 * On passe donc par le code pays (flags.ts, qui connaît tous les alias) et on
 * réécrit la valeur players.nationality correspondante : la seule qui fasse
 * autorité côté scoring, et que flags.ts sait traduire pour l'affichage.
 */

import type { createServiceClient } from './supabase-clients'
import { getCountryCode } from './flags'

type SB = ReturnType<typeof createServiceClient>

/** code pays → valeur players.nationality utilisée en base. */
export async function loadNationalityByCode(supabase: SB): Promise<Map<string, string>> {
  const byCode = new Map<string, string>()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('players')
      .select('nationality')
      .range(from, from + PAGE - 1)
    if (error || !data || data.length === 0) break
    for (const p of data) {
      const nat = p.nationality as string
      const code = getCountryCode(nat)
      if (code && !byCode.has(code)) byCode.set(code, nat)
    }
    if (data.length < PAGE) break
  }
  return byCode
}

/** Nom externe → nom canonique de la base, ou null si la nation est inconnue. */
export function canonicalTeamName(externalName: string, byCode: Map<string, string>): string | null {
  const code = getCountryCode(externalName)
  if (!code) return null
  return byCode.get(code) ?? null
}
