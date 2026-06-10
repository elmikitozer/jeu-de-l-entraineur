import { createClient } from '@supabase/supabase-js'
import { calculatePlayerPoints } from './scoring'
import type { Position, PlayerStats, PointsBreakdown } from './types'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Pour un participant nouvellement ajouté, calcule rétroactivement les points
 * sur tous les matchs déjà terminés. Idempotent (upsert sur la clé unique).
 * Retourne le total de points rétroactifs calculés.
 */
export async function syncRetroactive(participantId: string): Promise<number> {
  const supabase = getSupabase()

  // Récupérer l'équipe du participant avec la position de chaque joueur
  type RawTeamEntry = { player_id: string; players: { position: string } | null }
  const { data: teamEntries, error: teamErr } = await supabase
    .from('teams')
    .select('player_id, players(position)')
    .eq('participant_id', participantId)

  if (teamErr || !teamEntries || teamEntries.length === 0) return 0

  const playerPositions = new Map<string, Position>()
  for (const entry of teamEntries as unknown as RawTeamEntry[]) {
    if (entry.players) {
      playerPositions.set(entry.player_id, entry.players.position as Position)
    }
  }

  const playerIds = Array.from(playerPositions.keys())
  if (playerIds.length === 0) return 0

  // Tous les matchs terminés
  const { data: finishedMatches } = await supabase
    .from('matches')
    .select('id')
    .eq('status', 'finished')

  if (!finishedMatches || finishedMatches.length === 0) return 0

  const matchIds = finishedMatches.map((m) => m.id as string)

  // Stats existantes pour ces joueurs × ces matchs
  const { data: existingStats } = await supabase
    .from('player_stats')
    .select('*')
    .in('player_id', playerIds)
    .in('match_id', matchIds)

  if (!existingStats || existingStats.length === 0) return 0

  let retroPoints = 0

  for (const raw of existingStats) {
    const position = playerPositions.get(raw.player_id as string)
    if (!position) continue

    const stats: PlayerStats = {
      id: raw.id as string,
      player_id: raw.player_id as string,
      match_id: raw.match_id as string,
      played: raw.played as boolean,
      result: raw.result as PlayerStats['result'],
      goals: raw.goals as number,
      assists: raw.assists as number,
      motm: raw.motm as boolean,
      yellow_cards: raw.yellow_cards as number,
      red_cards: raw.red_cards as number,
      penalty_saved: raw.penalty_saved as number,
      penalty_scored: raw.penalty_scored as number,
      freekick_goal: raw.freekick_goal as number,
      cleansheet: raw.cleansheet as boolean,
    }

    const scoring = calculatePlayerPoints(stats, position)

    const breakdown: PointsBreakdown = {
      win_bonus: scoring.win_bonus,
      draw_bonus: scoring.draw_bonus,
      goal_position_bonus: scoring.goal_position_bonus,
      goal_freekick_bonus: scoring.goal_freekick_bonus,
      goal_penalty_bonus: scoring.goal_penalty_bonus,
      assist_bonus: scoring.assist_bonus,
      motm_bonus: scoring.motm_bonus,
      cleansheet_bonus: scoring.cleansheet_bonus,
      penalty_saved_bonus: scoring.penalty_saved_bonus,
      red_card_malus: scoring.red_card_malus,
    }

    await supabase.from('points_log').upsert(
      {
        participant_id: participantId,
        player_id: raw.player_id as string,
        match_id: raw.match_id as string,
        points_breakdown: breakdown,
        total_points: scoring.total,
      },
      { onConflict: 'participant_id,player_id,match_id' }
    )

    retroPoints += scoring.total
  }

  // Recalcul du total du participant
  const { data: allLogs } = await supabase
    .from('points_log')
    .select('total_points')
    .eq('participant_id', participantId)

  const grandTotal = (allLogs ?? []).reduce(
    (sum, row) => sum + ((row.total_points as number) || 0),
    0
  )

  await supabase
    .from('participants')
    .update({ total_points: grandTotal })
    .eq('id', participantId)

  return retroPoints
}
