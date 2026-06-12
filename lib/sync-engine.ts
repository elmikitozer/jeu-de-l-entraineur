/**
 * sync-engine.ts — Orchestre la synchronisation des stats API-Football vers Supabase.
 *
 * Flux : fetchStats → player_stats upsert → calculatePoints → points_log → participants.total_points
 * Idempotent : relancer deux fois de suite ne crée pas de doublons.
 */

import { createClient } from '@supabase/supabase-js'
import { calculatePlayerPoints } from './scoring'
import {
  fetchLiveMatchStats,
  fetchFinalMatchStats,
  fetchFixtureResult,
  type RawPlayerStats,
} from './api-football'
import type { Position, PointsBreakdown, PlayerStats } from './types'
import { parseMatchDateUTC } from './datetime'

// ── Types ────────────────────────────────────────────────────────────────────

export interface SyncResult {
  matchId: string
  mode: 'live' | 'final' | 'post-check'
  playersUpdated: number
  participantsUpdated: number
  errors: string[]
}

// Durée de la fenêtre live en millisecondes (2h45)
const LIVE_WINDOW_MS = 165 * 60 * 1000

// Statuts API-Football indiquant que le match est terminé
const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO'])

// ── Client Supabase ───────────────────────────────────────────────────────────

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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
    result: raw.played ? raw.result : null,
    goals: raw.goals,
    assists: raw.assists,
    motm: raw.motm,
    yellow_cards: raw.yellowCards,
    red_cards: raw.redCards,
    penalty_saved: raw.penaltySaved,
    penalty_scored: raw.penaltyScored,
    freekick_goal: raw.freekickGoal,
    cleansheet: raw.cleansheet,
  }
}

// ── syncMatch ────────────────────────────────────────────────────────────────

export async function syncMatch(matchId: string): Promise<SyncResult> {
  const supabase = getSupabase()
  const errors: string[] = []

  // ── 1. Charger le match ───────────────────────────────────────────────────

  const { data: matchRow, error: matchErr } = await supabase
    .from('matches')
    .select('id, api_match_id, date, status, sync_attempts')
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
  } else if (now >= kickoff && now <= liveWindowEnd) {
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
    throw new Error(`Match ${matchId} n'est pas encore dans la fenêtre de sync`)
  }

  // ── 3. Score et statut API ────────────────────────────────────────────────

  let fixtureResult = { homeScore: 0, awayScore: 0, status: 'NS' }
  try {
    fixtureResult = await fetchFixtureResult(apiMatchId)
  } catch (err) {
    errors.push(`fetchFixtureResult: ${err instanceof Error ? err.message : String(err)}`)
  }

  const apiSaysFinished = FINISHED_STATUSES.has(fixtureResult.status)

  // ── 4. Joueurs de notre DB avec api_football_id ───────────────────────────

  const { data: ourPlayers } = await supabase
    .from('players')
    .select('id, position, api_football_id')
    .not('api_football_id', 'is', null)

  const apiIdToPlayer = new Map<number, { id: string; position: string }>(
    (ourPlayers ?? []).map((p) => [
      p.api_football_id as number,
      { id: p.id as string, position: p.position as string },
    ])
  )

  // ── 5. Upsert player_stats et recalcul des points ─────────────────────────

  const updatedPlayerIds: string[] = []

  for (const raw of rawStats) {
    const ourPlayer = apiIdToPlayer.get(raw.playerId)
    if (!ourPlayer) continue // joueur non présent dans notre DB → ignorer

    const statsForScoring = toPlayerStats(raw, matchId)
    const position = ourPlayer.position as Position

    // Upsert player_stats (UNIQUE sur player_id, match_id)
    const { error: statsErr } = await supabase.from('player_stats').upsert(
      {
        player_id: ourPlayer.id,
        match_id: matchId,
        played: raw.played,
        result: raw.played ? raw.result : null,
        goals: raw.goals,
        assists: raw.assists,
        motm: raw.motm,
        yellow_cards: raw.yellowCards,
        red_cards: raw.redCards,
        penalty_saved: raw.penaltySaved,
        penalty_scored: raw.penaltyScored,
        freekick_goal: raw.freekickGoal,
        cleansheet: raw.cleansheet,
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

  // ── 6. Recalcul total_points des participants affectés ────────────────────

  const affectedParticipants = new Set<string>()

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

  // ── 7. Mettre à jour le statut du match ───────────────────────────────────

  const newStatus =
    mode === 'live' && !apiSaysFinished
      ? 'live'
      : 'finished'

  // sync_attempts ne compte que les syncs post-match (final + post-check)
  const syncAttempts =
    mode === 'live' ? (matchRow.sync_attempts as number) : ((matchRow.sync_attempts as number) ?? 0) + 1

  await supabase
    .from('matches')
    .update({
      status: newStatus,
      home_score: fixtureResult.homeScore,
      away_score: fixtureResult.awayScore,
      last_verified_at: new Date().toISOString(),
      sync_attempts: syncAttempts,
    })
    .eq('id', matchId)

  return {
    matchId,
    mode,
    playersUpdated: updatedPlayerIds.length,
    participantsUpdated: affectedParticipants.size,
    errors,
  }
}
