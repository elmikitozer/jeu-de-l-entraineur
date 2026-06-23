/**
 * motm-reconcile.ts — Applique le MOTM officiel FIFA aux matchs terminés dès
 * qu'il est publié, même tardivement.
 *
 * Problème résolu : le MOTM officiel FIFA arrive parfois APRÈS que le cron a
 * cessé de re-synchroniser le match (plafond de post-checks). Le proxy (meilleur
 * rating) reste alors figé à tort. Cette réconciliation tourne à chaque cycle de
 * cron (en même temps que la chronique) : pour chaque match terminé sans MOTM
 * officiel encore capté, si FIFA l'a publié, elle met à jour player_stats puis
 * recalcule les points_log et les totaux des participants concernés.
 *
 * Idempotent : un match dont le MOTM officiel est déjà appliqué est ignoré.
 * Partage exactement la logique de scoring de syncMatch (aucune divergence).
 */

import type { createServiceClient } from './supabase-clients'
import { calculatePlayerPoints } from './scoring'
import { fetchFifaMotm, matchEntryToFixture, bestNameMatch } from './fifa-motm'
import { getCountryCode } from './flags'
import type { Position, PlayerStats, PointsBreakdown } from './types'

type SB = ReturnType<typeof createServiceClient>

export interface MotmReconcileResult {
  matchesUpdated: number
  rowsUpdated: number
  participantsRecalculated: number
  notPublished: number  // match terminé dont FIFA n'a pas (encore) publié le MOTM
  notMapped: number     // MOTM officiel hors de notre pool / non mappé
  errors: string[]
}

export interface MotmReconcileOptions {
  /** Écrit en base si true (défaut). false = simulation (dry-run). */
  apply?: boolean
  /** Ne traiter que les matchs dont le coup d'envoi est dans cette fenêtre (ms).
   *  Omis ⇒ tous les matchs terminés. Le cron passe une fenêtre courte ; le
   *  script de backfill ne passe rien (tout l'historique). */
  windowMs?: number
  /** Hook de log optionnel (le script CLI l'utilise pour son affichage). */
  onLog?: (msg: string) => void
}

function toBreakdown(r: ReturnType<typeof calculatePlayerPoints>): PointsBreakdown {
  return {
    win_bonus: r.win_bonus,
    draw_bonus: r.draw_bonus,
    goal_position_bonus: r.goal_position_bonus,
    goal_freekick_bonus: r.goal_freekick_bonus,
    goal_penalty_bonus: r.goal_penalty_bonus,
    assist_bonus: r.assist_bonus,
    motm_bonus: r.motm_bonus,
    cleansheet_bonus: r.cleansheet_bonus,
    penalty_saved_bonus: r.penalty_saved_bonus,
    red_card_malus: r.red_card_malus,
  }
}

export async function reconcileOfficialMotm(
  supabase: SB,
  options: MotmReconcileOptions = {},
): Promise<MotmReconcileResult> {
  const apply = options.apply ?? true
  const log = options.onLog ?? (() => {})

  const result: MotmReconcileResult = {
    matchesUpdated: 0,
    rowsUpdated: 0,
    participantsRecalculated: 0,
    notPublished: 0,
    notMapped: 0,
    errors: [],
  }

  // 1. Matchs terminés (optionnellement bornés à une fenêtre récente)
  let matchQuery = supabase
    .from('matches')
    .select('id, home_team, away_team, home_score, away_score, date')
    .eq('status', 'finished')
    .order('date', { ascending: true })
  if (options.windowMs != null && Number.isFinite(options.windowMs)) {
    matchQuery = matchQuery.gte('date', new Date(Date.now() - options.windowMs).toISOString())
  }
  const { data: matches, error: matchErr } = await matchQuery
  if (matchErr) {
    result.errors.push(`matches: ${matchErr.message}`)
    return result
  }
  if (!matches || matches.length === 0) return result

  const matchIds = matches.map((m) => m.id as string)

  // 2. Matchs dont le MOTM officiel est DÉJÀ capté → à ignorer (idempotence,
  //    évite de re-scanner l'historique à chaque cycle).
  const { data: officialRows } = await supabase
    .from('player_stats')
    .select('match_id')
    .eq('motm_official', true)
    .in('match_id', matchIds)
  const reconciled = new Set((officialRows ?? []).map((r) => r.match_id as string))
  const pending = matches.filter((m) => !reconciled.has(m.id as string))
  if (pending.length === 0) return result

  // 3. MOTM officiels FIFA (1 appel, mémoïsé) + pool complet
  const entries = await fetchFifaMotm()

  const PAGE = 1000
  const pool: Array<{ id: string; name: string; nationality: string; position: Position }> = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, nationality, position')
      .range(from, from + PAGE - 1)
    if (error) {
      result.errors.push(`players page ${from}: ${error.message}`)
      break
    }
    if (!data || data.length === 0) break
    pool.push(...(data as unknown as typeof pool))
    if (data.length < PAGE) break
  }
  const posOf = new Map(pool.map((p) => [p.id, p.position]))

  const affectedParticipants = new Set<string>()

  // 4. Par match en attente
  for (const m of pending) {
    const entry = matchEntryToFixture(
      entries,
      m.home_team as string,
      m.away_team as string,
      (m.home_score as number) ?? -1,
      (m.away_score as number) ?? -1,
    )
    if (!entry) {
      result.notPublished++
      continue
    }

    // Mapper l'officiel vers notre pool (filtré par nationalité)
    const natCode = getCountryCode(entry.nationality)
    const candidates = pool
      .filter((p) => getCountryCode(p.nationality) === natCode)
      .map((p) => ({ id: p.id, name: p.name }))
    const officialMotmPlayerId = bestNameMatch(entry.player, candidates)
    if (!officialMotmPlayerId) {
      result.notMapped++
      log(`  ⚠️  ${m.home_team} ${m.home_score}-${m.away_score} ${m.away_team} — officiel hors pool : ${entry.player} (${entry.nationality})`)
    }

    const { data: rows, error: statErr } = await supabase
      .from('player_stats')
      .select('id, player_id, played, result, goals, assists, motm, motm_proxy, motm_official, yellow_cards, red_cards, penalty_saved, penalty_scored, freekick_goal, cleansheet, minutes')
      .eq('match_id', m.id as string)
    if (statErr) {
      result.errors.push(`player_stats match ${m.id}: ${statErr.message}`)
      continue
    }

    let matchTouched = false
    for (const row of rows ?? []) {
      const playerId = row.player_id as string
      // Officiel publié → l'officiel prime ; le proxy ne porte plus le bonus.
      const newOfficial = officialMotmPlayerId !== null && playerId === officialMotmPlayerId
      const newEffective = newOfficial
      const oldOfficial = row.motm_official as boolean
      const oldEffective = row.motm as boolean
      if (newOfficial === oldOfficial && newEffective === oldEffective) continue

      const position = posOf.get(playerId)
      if (!position) {
        result.errors.push(`position introuvable pour player ${playerId}`)
        continue
      }

      const playerName = pool.find((p) => p.id === playerId)?.name ?? playerId
      log(
        `  ${newOfficial ? '⭐' : '↩️ '} ${m.home_team} ${m.home_score}-${m.away_score} ${m.away_team} : ${playerName} ` +
          `motm ${oldEffective}→${newEffective}, official ${oldOfficial}→${newOfficial}`,
      )

      result.rowsUpdated++
      matchTouched = true
      if (!apply) continue

      const { error: upErr } = await supabase
        .from('player_stats')
        .update({ motm: newEffective, motm_official: newOfficial })
        .eq('id', row.id as string)
      if (upErr) {
        result.errors.push(`update player_stats ${row.id}: ${upErr.message}`)
        continue
      }

      const stats: PlayerStats = {
        id: row.id as string,
        player_id: playerId,
        match_id: m.id as string,
        played: row.played as boolean,
        result: row.result as PlayerStats['result'],
        goals: row.goals as number,
        assists: row.assists as number,
        motm: newEffective,
        yellow_cards: row.yellow_cards as number,
        red_cards: row.red_cards as number,
        penalty_saved: row.penalty_saved as number,
        penalty_scored: row.penalty_scored as number,
        freekick_goal: row.freekick_goal as number,
        cleansheet: row.cleansheet as boolean,
        minutes: (row.minutes as number | null) ?? null,
      }
      const scoring = calculatePlayerPoints(stats, position)
      const breakdown = toBreakdown(scoring)

      const { data: teamEntries } = await supabase
        .from('teams')
        .select('participant_id')
        .eq('player_id', playerId)

      for (const { participant_id } of teamEntries ?? []) {
        const pid = participant_id as string
        const { error: logErr } = await supabase.from('points_log').upsert(
          {
            participant_id: pid,
            player_id: playerId,
            match_id: m.id as string,
            points_breakdown: breakdown,
            total_points: scoring.total,
          },
          { onConflict: 'participant_id,player_id,match_id' },
        )
        if (logErr) result.errors.push(`points_log p=${pid} j=${playerId}: ${logErr.message}`)
        else affectedParticipants.add(pid)
      }
    }
    if (matchTouched) result.matchesUpdated++
  }

  // 5. Recalcul des totaux des participants affectés
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
