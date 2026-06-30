/**
 * knockout-resolver.ts — Remplace les placeholders des matchs à élimination
 * directe par les vrais matchs API-Football, au fil des qualifications.
 *
 * Pourquoi : le seed Kaggle a importé les 32 matchs de phase finale avec des
 * api_match_id séquentiels (73→104) et des équipes "TBD". L'API-Football ne crée
 * la fixture réelle d'un match à élimination directe qu'une fois ses deux équipes
 * connues. Ce resolver fait le pont : à chaque cycle de cron, il récupère le
 * calendrier CdM, aligne par round les fixtures réelles sur nos lignes
 * placeholder, et réécrit api_match_id + équipes + date. Les matchs déjà joués
 * (ou en cours) fraîchement remappés sont resynchronisés immédiatement pour
 * créditer les points, car ils sont souvent hors de la fenêtre de rattrapage 24h
 * du cron.
 *
 * Idempotent : une ligne déjà mappée à un vrai fixture est verrouillée (jamais
 * re-zippée), donc relancer le resolver ne déplace rien.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchWorldCupFixtures, type WorldCupFixture } from './api-football'
import { syncMatch } from './sync-engine'

// Stages de phase finale tels que stockés en base (langue FR du seed).
export const KNOCKOUT_STAGES = [
  '16e de finales',
  'Huitièmes de finale',
  'Quarts de finale',
  'Demi-finales',
  'Match pour la 3e place',
  'Finale',
] as const

// Au-delà de ce seuil, l'api_match_id est un vrai ID API-Football ; en dessous,
// c'est un placeholder du seed (73→104).
const REAL_API_ID_THRESHOLD = 100_000

// Statuts API indiquant qu'un match a commencé ou est terminé : il faut le
// synchroniser dès le remap (le cron ne le rattraperait pas s'il est ancien).
const PLAYED_OR_LIVE = new Set([
  'FT', 'AET', 'PEN', 'AWD', 'WO',           // terminés
  '1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'SUSP', 'INT', // en cours
])

/** Classe un round API-Football vers le stage stocké en base, ou null si hors phase finale. */
export function stageFromApiRound(round: string): (typeof KNOCKOUT_STAGES)[number] | null {
  const r = round.toLowerCase()
  if (/round of 32/.test(r)) return '16e de finales'
  if (/round of 16/.test(r)) return 'Huitièmes de finale'
  if (/quarter/.test(r)) return 'Quarts de finale'
  if (/semi/.test(r)) return 'Demi-finales'
  if (/3rd place|third place/.test(r)) return 'Match pour la 3e place'
  if (/final/.test(r)) return 'Finale' // après le check 3e place ("3rd Place Final" contient "final")
  return null
}

export interface KnockoutDbRow {
  id: string
  api_match_id: number | null
  home_team: string
  away_team: string
  date: string
}

/** Une ligne de phase finale a-t-elle encore besoin d'être résolue ? */
export function needsKnockoutResolution(row: {
  stage: string | null
  home_team: string
  api_match_id: number | null
}): boolean {
  if (!row.stage || !(KNOCKOUT_STAGES as readonly string[]).includes(row.stage)) return false
  return row.home_team === 'TBD' || (row.api_match_id ?? 0) < REAL_API_ID_THRESHOLD
}

export interface ResolveResult {
  remapped: number          // lignes dont l'api_match_id a changé
  refreshed: number         // lignes déjà mappées dont équipes/date ont été rafraîchies
  resynced: number          // matchs joués/en cours resynchronisés dans la foulée
  errors: string[]
}

export async function resolveKnockoutFixtures(
  supabase: SupabaseClient
): Promise<ResolveResult> {
  const errors: string[] = []

  let fixtures: WorldCupFixture[]
  try {
    fixtures = await fetchWorldCupFixtures()
  } catch (err) {
    return { remapped: 0, refreshed: 0, resynced: 0, errors: [`fetchWorldCupFixtures: ${msg(err)}`] }
  }

  // Regrouper les fixtures API par stage (uniquement la phase finale).
  const apiByStage = new Map<string, WorldCupFixture[]>()
  for (const fx of fixtures) {
    const stage = stageFromApiRound(fx.round)
    if (!stage) continue
    // Sécurité : ignorer une fixture sans vrais noms d'équipes.
    if (!fx.homeName || !fx.awayName) continue
    const list = apiByStage.get(stage)
    if (list) list.push(fx)
    else apiByStage.set(stage, [fx])
  }

  // Charger toutes nos lignes de phase finale.
  const { data: dbRows, error: dbErr } = await supabase
    .from('matches')
    .select('id, api_match_id, home_team, away_team, date, stage')
    .in('stage', KNOCKOUT_STAGES as unknown as string[])

  if (dbErr) {
    return { remapped: 0, refreshed: 0, resynced: 0, errors: [`load matches: ${dbErr.message}`] }
  }

  const byDate = (a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date)
  const toResync = new Set<string>()
  let remapped = 0
  let refreshed = 0

  for (const stage of KNOCKOUT_STAGES) {
    const apiFixes = (apiByStage.get(stage) ?? []).slice().sort(byDate)
    const rows = ((dbRows ?? []) as unknown as Array<KnockoutDbRow & { stage: string }>)
      .filter((r) => r.stage === stage)
    if (apiFixes.length === 0 || rows.length === 0) continue

    const apiById = new Map(apiFixes.map((f) => [f.id, f]))

    // 1. Lignes déjà mappées (verrouillées) → simple rafraîchissement des
    //    équipes/date si l'API a fait évoluer la fixture.
    for (const row of rows) {
      if (row.api_match_id == null || !apiById.has(row.api_match_id)) continue
      const fx = apiById.get(row.api_match_id)!
      if (row.home_team !== fx.homeName || row.away_team !== fx.awayName || row.date !== fx.date) {
        const { error } = await supabase
          .from('matches')
          .update({ home_team: fx.homeName, away_team: fx.awayName, date: fx.date })
          .eq('id', row.id)
        if (error) errors.push(`refresh ${row.id}: ${error.message}`)
        else refreshed++
      }
    }

    // 2. Lignes placeholder restantes ↔ fixtures API non encore mappées,
    //    appariées par ordre chronologique (eager).
    const mappedIds = new Set(
      rows.map((r) => r.api_match_id).filter((id): id is number => id != null && apiById.has(id))
    )
    const unmappedRows = rows.filter((r) => r.api_match_id == null || !apiById.has(r.api_match_id)).sort(byDate)
    const unmappedApi = apiFixes.filter((f) => !mappedIds.has(f.id))

    const n = Math.min(unmappedRows.length, unmappedApi.length)
    for (let i = 0; i < n; i++) {
      const row = unmappedRows[i]!
      const fx = unmappedApi[i]!
      // Remap complet + reset de l'état de sync pour que le match soit
      // resynchronisé proprement avec le bon fixture.
      const { error } = await supabase
        .from('matches')
        .update({
          api_match_id: fx.id,
          home_team: fx.homeName,
          away_team: fx.awayName,
          date: fx.date,
          status: 'scheduled',
          home_score: null,
          away_score: null,
          minute: null,
          status_short: null,
          sync_attempts: 0,
          last_verified_at: null,
        })
        .eq('id', row.id)
      if (error) {
        errors.push(`remap ${row.id} → ${fx.id}: ${error.message}`)
        continue
      }
      remapped++
      if (PLAYED_OR_LIVE.has(fx.status)) toResync.add(row.id)
    }
  }

  // 3. Resync immédiat des matchs joués/en cours fraîchement remappés.
  let resynced = 0
  if (toResync.size > 0) {
    const ids = Array.from(toResync)
    const results = await Promise.allSettled(ids.map((id) => syncMatch(id)))
    for (let i = 0; i < results.length; i++) {
      const res = results[i]!
      if (res.status === 'fulfilled') {
        resynced++
        if (res.value.errors.length > 0) errors.push(...res.value.errors.map((e) => `[resync ${ids[i]}] ${e}`))
      } else {
        errors.push(`[resync ${ids[i]}] ${msg(res.reason)}`)
      }
    }
  }

  return { remapped, refreshed, resynced, errors }
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
