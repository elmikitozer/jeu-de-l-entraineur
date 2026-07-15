/**
 * fifa-fallback.ts — Renseigne les matchs de phase finale depuis le flux FIFA
 * quand l'API-Football est hors d'atteinte.
 *
 * Contexte : le plan API-Football gratuit n'a aucun accès à la saison 2026
 * ("Free plans do not have access to this season"). Impossible même de
 * DÉCOUVRIR la fixture d'un match : cela passe par /fixtures?league&season, que
 * le plan refuse. Les demi-finales, la 3e place et la finale resteraient donc
 * éternellement "TBD" et sans points.
 *
 * Le flux FIFA (cxm-api, gratuit, déjà utilisé pour le MOTM) publie, pour chaque
 * match joué : les deux équipes, le score réglementaire et l'homme du match.
 * C'est assez pour créditer :
 *   - le bonus de résultat collectif (Victoire +3 / Nul +1) à TOUT joueur
 *     sélectionné des deux nations, via applyAbsentTeamResultBonus ;
 *   - le +3 homme du match, via reconcileOfficialMotm (déjà appelé par le cron),
 *     qui apparie l'entrée FIFA au match par code pays + score — donc dès que
 *     les vraies équipes et le score sont écrits ici, il fait le reste seul.
 *
 * Ce qu'on ne peut PAS reconstituer : buts, passes décisives, cartons,
 * cleansheet, penalties — le flux FIFA ne les donne pas. C'est un mode dégradé
 * assumé, en attendant le retour d'un plan payant.
 *
 * Jointure : le seed a importé les matchs de phase finale avec
 * api_match_id = numéro de match officiel FIFA (73→104), exactement la
 * numérotation du flux ("Match 101 – …"). Tant qu'une ligne porte ce
 * placeholder, l'API ne l'a jamais résolue → c'est une candidate au fallback.
 *
 * Réversible : dès que l'abonnement payant revient, le resolver remappe ces
 * lignes vers la vraie fixture et le sync écrase ces données partielles par les
 * stats complètes. Rien ici n'est un cul-de-sac.
 */

import type { createServiceClient } from './supabase-clients'
import { fetchFifaMotm } from './fifa-motm'
import { isPlaceholderApiId, KNOCKOUT_STAGES } from './knockout-resolver'
import { applyAbsentTeamResultBonus } from './team-result-bonus'
import { loadNationalityByCode, canonicalTeamName } from './team-names'

type SB = ReturnType<typeof createServiceClient>

export interface FifaFallbackResult {
  matchesUpdated: number
  participantsRecalculated: number
  notPublished: number // ligne en placeholder dont FIFA n'a pas encore publié le match
  errors: string[]
}

export interface FifaFallbackOptions {
  /** Écrit en base si true (défaut). false = simulation. */
  apply?: boolean
  onLog?: (msg: string) => void
}

export async function applyFifaFallback(
  supabase: SB,
  options: FifaFallbackOptions = {},
): Promise<FifaFallbackResult> {
  const apply = options.apply ?? true
  const log = options.onLog ?? (() => {})
  const result: FifaFallbackResult = {
    matchesUpdated: 0,
    participantsRecalculated: 0,
    notPublished: 0,
    errors: [],
  }

  // 1. Lignes de phase finale que l'API n'a jamais résolues.
  const { data: rows, error: rowsErr } = await supabase
    .from('matches')
    .select('id, api_match_id, home_team, away_team, status, stage, date')
    .in('stage', KNOCKOUT_STAGES as unknown as string[])
    .order('date', { ascending: true })
  if (rowsErr) {
    result.errors.push(`matches: ${rowsErr.message}`)
    return result
  }
  const pending = (rows ?? []).filter(
    (r) => isPlaceholderApiId(r.api_match_id as number | null) && r.status !== 'finished',
  )
  if (pending.length === 0) return result

  // 2. Flux FIFA (gratuit, mémoïsé 60 s).
  let entries
  try {
    entries = await fetchFifaMotm()
  } catch (err) {
    result.errors.push(`fetchFifaMotm: ${err instanceof Error ? err.message : String(err)}`)
    return result
  }

  // 3. Noms canoniques (players.nationality) par code pays.
  const byCode = await loadNationalityByCode(supabase)

  const affectedParticipants = new Set<string>()

  for (const row of pending) {
    const fifaNo = row.api_match_id as number
    const entry = entries.find((e) => e.matchNumber === fifaNo)
    if (!entry) {
      result.notPublished++
      continue
    }

    const home = canonicalTeamName(entry.home, byCode)
    const away = canonicalTeamName(entry.away, byCode)
    if (!home || !away) {
      result.errors.push(
        `Match ${fifaNo} : équipe non résolue (${entry.home} / ${entry.away})`,
      )
      continue
    }

    log(
      `  ⚽ Match ${fifaNo} (${row.stage}) : ${home} ${entry.homeScore}-${entry.awayScore} ${away}` +
        ` — MOTM FIFA ${entry.player} (${entry.nationality})`,
    )
    result.matchesUpdated++
    if (!apply) continue

    // Le score FIFA est le score réglementaire : un match gagné aux TAB reste un
    // nul (+1 chacun), ce qui est bien la règle du barème.
    const { error: upErr } = await supabase
      .from('matches')
      .update({
        home_team: home,
        away_team: away,
        home_score: entry.homeScore,
        away_score: entry.awayScore,
        status: 'finished',
        status_short: 'FT',
        last_verified_at: new Date().toISOString(),
      })
      .eq('id', row.id as string)
    if (upErr) {
      result.errors.push(`update match ${fifaNo}: ${upErr.message}`)
      continue
    }

    // Bonus de résultat pour toutes les sélections des deux nations. Le +3 MOTM
    // est posé ensuite par reconcileOfficialMotm (cron), qui trouve désormais
    // l'entrée FIFA puisque équipes + score concordent.
    try {
      const affected = await applyAbsentTeamResultBonus(supabase, row.id as string)
      for (const pid of Array.from(affected)) affectedParticipants.add(pid)
    } catch (err) {
      result.errors.push(
        `bonus résultat ${fifaNo}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  // 4. Recalcul des totaux des participants touchés.
  if (apply) {
    for (const pid of Array.from(affectedParticipants)) {
      const { data: logs } = await supabase
        .from('points_log')
        .select('total_points')
        .eq('participant_id', pid)
      const total = (logs ?? []).reduce((s, r) => s + ((r.total_points as number) || 0), 0)
      await supabase.from('participants').update({ total_points: total }).eq('id', pid)
    }
  }
  result.participantsRecalculated = affectedParticipants.size

  return result
}
