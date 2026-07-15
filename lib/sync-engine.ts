/**
 * sync-engine.ts — Orchestre la synchronisation des stats API-Football vers Supabase.
 *
 * Flux : fetchStats → player_stats upsert → calculatePoints → points_log → participants.total_points
 * Idempotent : relancer deux fois de suite ne crée pas de doublons.
 */

import { createServiceClient as getSupabase } from '@/lib/supabase-clients'
import { calculatePlayerPoints } from './scoring'
import {
  fetchLiveMatchStats,
  fetchFinalMatchStats,
  fetchFixtureResult,
  fetchMatchEvents,
  type RawPlayerStats,
} from './api-football'
import type { Position, PointsBreakdown, PlayerStats } from './types'
import { parseMatchDateUTC } from './datetime'
import { fetchFifaMotm, matchEntryToFixture, bestNameMatch } from './fifa-motm'
import { getCountryCode } from './flags'
import { applyAbsentTeamResultBonus } from './team-result-bonus'
import { getSyncMode } from './sync-mode'

// ── Types ────────────────────────────────────────────────────────────────────

export interface SyncResult {
  matchId: string
  mode: 'live' | 'final' | 'post-check'
  playersUpdated: number
  participantsUpdated: number
  errors: string[]
}

// Durée de la fenêtre live / délai au terme duquel un match est réputé terminé
// (prolongation + TAB comprises) : 2h45.
const LIVE_WINDOW_MS = 165 * 60 * 1000

// Statuts API-Football indiquant que le match est terminé
const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO'])

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extrait le PointsBreakdown (sans total) depuis un ScoringResult. */
function toBreakdown(result: ReturnType<typeof calculatePlayerPoints>): PointsBreakdown {
  return {
    win_bonus: result.win_bonus,
    draw_bonus: result.draw_bonus,
    goal_position_bonus: result.goal_position_bonus,
    goal_freekick_bonus: result.goal_freekick_bonus,
    goal_penalty_bonus: result.goal_penalty_bonus,
    assist_bonus: result.assist_bonus,
    motm_bonus: result.motm_bonus,
    cleansheet_bonus: result.cleansheet_bonus,
    penalty_saved_bonus: result.penalty_saved_bonus,
    red_card_malus: result.red_card_malus,
  }
}

/** Construit un PlayerStats partiel suffisant pour calculatePlayerPoints. */
function toPlayerStats(raw: RawPlayerStats, matchId: string): PlayerStats {
  return {
    id: '',
    player_id: '',
    match_id: matchId,
    played: raw.played,
    result: raw.result,
    goals: raw.goals,
    assists: raw.assists,
    motm: raw.motm,
    yellow_cards: raw.yellowCards,
    red_cards: raw.redCards,
    penalty_saved: raw.penaltySaved,
    penalty_scored: raw.penaltyScored,
    freekick_goal: raw.freekickGoal,
    cleansheet: raw.cleansheet,
    minutes: raw.minutes,
  }
}

// ── syncMatch ────────────────────────────────────────────────────────────────

export async function syncMatch(matchId: string): Promise<SyncResult> {
  const supabase = getSupabase()
  const errors: string[] = []
  const syncMode = getSyncMode()

  // ── 1. Charger le match ───────────────────────────────────────────────────

  const { data: matchRow, error: matchErr } = await supabase
    .from('matches')
    .select('id, api_match_id, date, status, sync_attempts, home_team, away_team')
    .eq('id', matchId)
    .single()

  if (matchErr || !matchRow) {
    throw new Error(`Match ${matchId} introuvable : ${matchErr?.message ?? 'null'}`)
  }

  const apiMatchId = matchRow.api_match_id as number | null
  if (!apiMatchId) {
    throw new Error(`Match ${matchId} n'a pas d'api_match_id`)
  }

  // ── 2. Déterminer le mode ─────────────────────────────────────────────────

  const now = new Date()
  const kickoff = parseMatchDateUTC(matchRow.date as string)
  const liveWindowEnd = new Date(kickoff.getTime() + LIVE_WINDOW_MS)
  const currentStatus = matchRow.status as string

  let mode: 'live' | 'final' | 'post-check'
  let rawStats: RawPlayerStats[]

  if (currentStatus === 'finished') {
    mode = 'post-check'
    rawStats = await fetchFinalMatchStats(apiMatchId)
  } else if (syncMode === 'live' && now >= kickoff && now <= liveWindowEnd) {
    // Temps réel : réservé au plan payant (cf. lib/sync-mode.ts).
    mode = 'live'
    rawStats = await fetchLiveMatchStats(apiMatchId)
    // Fallback si le live endpoint retourne vide (match pas encore détecté live)
    if (rawStats.length === 0) {
      rawStats = await fetchFinalMatchStats(apiMatchId)
    }
  } else if (now > liveWindowEnd) {
    mode = 'final'
    rawStats = await fetchFinalMatchStats(apiMatchId)
  } else {
    // En mode 'final', un match dans sa fenêtre de jeu n'est pas encore
    // synchronisable : on attend qu'il soit censé terminé plutôt que de dépenser
    // une requête pour un résultat partiel.
    throw new Error(`Match ${matchId} n'est pas encore dans la fenêtre de sync`)
  }

  // ── 3. Score et statut API ────────────────────────────────────────────────

  let fixtureResult: { homeScore: number; awayScore: number; status: string; elapsed: number | null } = {
    homeScore: 0, awayScore: 0, status: 'NS', elapsed: null,
  }
  let fixtureFetchOk = false
  try {
    fixtureResult = await fetchFixtureResult(apiMatchId)
    fixtureFetchOk = true
  } catch (err) {
    errors.push(`fetchFixtureResult: ${err instanceof Error ? err.message : String(err)}`)
  }

  const apiSaysFinished = FINISHED_STATUSES.has(fixtureResult.status)
  // L'API n'a pas (encore) commencé ce match, ou la fixture est introuvable :
  // on ne doit PAS fabriquer un faux résultat "finished 0-0". Cas typique d'un
  // api_match_id placeholder ou d'un match reporté.
  const apiUnknownOrNotStarted = !fixtureFetchOk || fixtureResult.status === 'NS' || fixtureResult.status === 'TBD'

  // ── 4. Joueurs de notre DB avec api_football_id ───────────────────────────
  // ⚠️ PostgREST plafonne chaque select à 1000 lignes. Le pool dépasse ce seuil
  // (>1200 joueurs mappés) → il FAUT paginer, sinon les joueurs au-delà de la
  // 1000e ligne sont invisibles au sync et leurs stats/points ne sont jamais
  // enregistrés (buts, cartons, etc. perdus silencieusement).

  const PAGE = 1000
  const ourPlayers: Array<{
    id: string
    position: string
    api_football_id: number
    name: string
    nationality: string
  }> = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('players')
      .select('id, position, api_football_id, name, nationality')
      .not('api_football_id', 'is', null)
      .range(from, from + PAGE - 1)
    if (error) {
      errors.push(`players page ${from}: ${error.message}`)
      break
    }
    if (!data || data.length === 0) break
    ourPlayers.push(...(data as unknown as typeof ourPlayers))
    if (data.length < PAGE) break
  }

  const apiIdToPlayer = new Map<number, { id: string; position: string }>(
    ourPlayers.map((p) => [
      p.api_football_id as number,
      { id: p.id as string, position: p.position as string },
    ])
  )

  // ── 4 bis. MOTM officiel FIFA (override du proxy rating, jamais bloquant) ───
  // On distingue :
  //   officialAvailable    : FIFA a publié le MOTM de ce match (entrée trouvée)
  //   officialMotmPlayerId : ce MOTM mappé dans NOTRE pool (null si hors pool)
  // Si officialAvailable mais joueur hors pool → aucun joueur du pool ne reçoit
  // le +3 (le proxy ne doit PAS reprendre la main : l'officiel prime).
  let officialAvailable = false
  let officialMotmPlayerId: string | null = null
  if (mode === 'final' || mode === 'post-check') {
    try {
      const entries = await fetchFifaMotm()
      const entry = matchEntryToFixture(
        entries,
        matchRow.home_team as string,
        matchRow.away_team as string,
        fixtureResult.homeScore,
        fixtureResult.awayScore,
      )
      if (entry) {
        officialAvailable = true
        const natCode = getCountryCode(entry.nationality)
        const candidates = ourPlayers
          .filter((p) => getCountryCode(p.nationality) === natCode)
          .map((p) => ({ id: p.id, name: p.name }))
        officialMotmPlayerId = bestNameMatch(entry.player, candidates)
        if (!officialMotmPlayerId) {
          // Hors pool ou non mappé : tracé pour inspection (proxy reste visible séparément)
          errors.push(`MOTM FIFA hors pool/non mappé : ${entry.player} (${entry.nationality})`)
        }
      }
    } catch (err) {
      // Fallback silencieux : on garde le proxy rating (raw.motm)
      errors.push(`fetchFifaMotm: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // ── 5. Upsert player_stats et recalcul des points ─────────────────────────

  const updatedPlayerIds: string[] = []

  for (const raw of rawStats) {
    const ourPlayer = apiIdToPlayer.get(raw.playerId)
    if (!ourPlayer) continue // joueur non présent dans notre DB → ignorer

    // MOTM : on conserve les deux sources EN PARALLÈLE.
    //   motm_proxy    = meilleur rating algo (raw.motm)
    //   motm_official = Player of the Match FIFA
    //   motm (effectif, porteur du +3) = officiel si dispo pour le match, sinon proxy
    const motmProxy = raw.motm
    const motmOfficial = officialAvailable && ourPlayer.id === officialMotmPlayerId
    const motmEffective = officialAvailable ? motmOfficial : motmProxy

    const statsForScoring = toPlayerStats(raw, matchId)
    statsForScoring.motm = motmEffective
    const position = ourPlayer.position as Position

    // Upsert player_stats (UNIQUE sur player_id, match_id)
    const { error: statsErr } = await supabase.from('player_stats').upsert(
      {
        player_id: ourPlayer.id,
        match_id: matchId,
        played: raw.played,
        // Résultat de l'équipe stocké même pour un remplaçant non entré : il lui
        // donne droit au bonus de résultat collectif (Victoire +3 / Nul +1).
        result: raw.result,
        goals: raw.goals,
        assists: raw.assists,
        motm: motmEffective,
        motm_proxy: motmProxy,
        motm_official: motmOfficial,
        yellow_cards: raw.yellowCards,
        red_cards: raw.redCards,
        penalty_saved: raw.penaltySaved,
        penalty_scored: raw.penaltyScored,
        freekick_goal: raw.freekickGoal,
        cleansheet: raw.cleansheet,
        minutes: raw.minutes,
      },
      { onConflict: 'player_id,match_id' }
    )

    if (statsErr) {
      errors.push(`player_stats ${ourPlayer.id}: ${statsErr.message}`)
      continue
    }

    // Calcul des points
    const scoring = calculatePlayerPoints(statsForScoring, position)
    const breakdown = toBreakdown(scoring)

    // Participants qui ont sélectionné ce joueur
    const { data: teamEntries } = await supabase
      .from('teams')
      .select('participant_id')
      .eq('player_id', ourPlayer.id)

    for (const { participant_id } of teamEntries ?? []) {
      // Upsert points_log (UNIQUE sur participant_id, player_id, match_id après migration)
      const { error: logErr } = await supabase.from('points_log').upsert(
        {
          participant_id: participant_id as string,
          player_id: ourPlayer.id,
          match_id: matchId,
          points_breakdown: breakdown,
          total_points: scoring.total,
        },
        { onConflict: 'participant_id,player_id,match_id' }
      )

      if (logErr) {
        errors.push(`points_log p=${participant_id as string} j=${ourPlayer.id}: ${logErr.message}`)
      }
    }

    updatedPlayerIds.push(ourPlayer.id)
  }

  // ── 5b. Timeline horodatée (match_events) ─────────────────────────────────
  // Remplace l'ensemble des événements du match (delete + insert) → idempotent.
  // Stocke tous les buteurs/cartons ; player_id lié si le joueur est dans le pool.
  try {
    const rawEvents = await fetchMatchEvents(apiMatchId)
    await supabase.from('match_events').delete().eq('match_id', matchId)
    if (rawEvents.length > 0) {
      const rows = rawEvents.map((e) => ({
        match_id: matchId,
        player_id: e.apiPlayerId != null ? apiIdToPlayer.get(e.apiPlayerId)?.id ?? null : null,
        player_name: e.playerName,
        type: e.type,
        side: e.side,
        minute: e.minute,
        extra: e.extra,
      }))
      const { error: evErr } = await supabase.from('match_events').insert(rows)
      if (evErr) errors.push(`match_events insert: ${evErr.message}`)
    }
  } catch (err) {
    errors.push(`fetchMatchEvents: ${err instanceof Error ? err.message : String(err)}`)
  }

  // ── 6. Mettre à jour le statut + score du match ───────────────────────────
  // Écrit AVANT le crédit des absents (qui lit le résultat) et le recalcul.

  // Statut introuvable/non démarré → on n'écrit JAMAIS un faux "finished 0-0" :
  // on conserve le statut courant (le match n'a pas réellement commencé).
  // Seul l'API décide qu'un match est terminé : sans ça, un match encore en
  // prolongation ou en TAB au moment du sync (statut 'ET'/'P'/'2H') serait figé
  // 'finished' sur un score partiel. S'il n'est pas fini, on garde le statut
  // courant et le cron réessaiera à la prochaine tentative.
  const newStatus = apiUnknownOrNotStarted
    ? currentStatus
    : apiSaysFinished
      ? 'finished'
      : mode === 'live'
        ? 'live'
        : currentStatus

  // sync_attempts ne compte que les syncs post-match (final + post-check)
  const syncAttempts =
    mode === 'live' ? (matchRow.sync_attempts as number) : ((matchRow.sync_attempts as number) ?? 0) + 1

  // On ne réécrit score/minute/statut court que si l'API a renvoyé un vrai
  // résultat. Sinon on se contente d'horodater (throttle) sans corrompre les
  // données existantes avec des zéros.
  const matchUpdate: Record<string, unknown> = {
    status: newStatus,
    last_verified_at: new Date().toISOString(),
    sync_attempts: syncAttempts,
  }
  if (!apiUnknownOrNotStarted) {
    matchUpdate.home_score = fixtureResult.homeScore
    matchUpdate.away_score = fixtureResult.awayScore
    matchUpdate.minute = fixtureResult.elapsed
    matchUpdate.status_short = fixtureResult.status
  }

  await supabase.from('matches').update(matchUpdate).eq('id', matchId)

  // ── 7. Bonus de résultat collectif pour les sélectionnés hors feuille ──────
  // Tout joueur sélectionné dont le pays a joué touche le bonus de résultat même
  // absent du groupe. Dépend du statut 'finished' + scores écrits ci-dessus.

  const affectedParticipants = new Set<string>()
  if (newStatus === 'finished') {
    const absentAffected = await applyAbsentTeamResultBonus(supabase, matchId)
    for (const pid of Array.from(absentAffected)) affectedParticipants.add(pid)
  }

  // ── 8. Recalcul total_points des participants affectés ────────────────────

  if (updatedPlayerIds.length > 0) {
    const { data: teams } = await supabase
      .from('teams')
      .select('participant_id')
      .in('player_id', updatedPlayerIds)

    for (const { participant_id } of teams ?? []) {
      affectedParticipants.add(participant_id as string)
    }
  }

  for (const participantId of Array.from(affectedParticipants)) {
    const { data: logs } = await supabase
      .from('points_log')
      .select('total_points')
      .eq('participant_id', participantId)

    const total = (logs ?? []).reduce(
      (sum, row) => sum + ((row.total_points as number) || 0),
      0
    )

    await supabase
      .from('participants')
      .update({ total_points: total })
      .eq('id', participantId)
  }

  return {
    matchId,
    mode,
    playersUpdated: updatedPlayerIds.length,
    participantsUpdated: affectedParticipants.size,
    errors,
  }
}
