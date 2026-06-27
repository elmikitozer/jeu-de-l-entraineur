/**
 * team-result-bonus.ts — Bonus de résultat collectif pour TOUT joueur sélectionné
 * dont le pays a joué, même absent de la feuille de match (blessé/non convoqué).
 *
 * Le sync normal ne crée des lignes player_stats que pour les joueurs listés par
 * l'API (titulaires + remplaçants vus). Un joueur sélectionné resté hors groupe
 * n'a donc aucune ligne et ne touchait rien. Cette fonction comble le trou : pour
 * chaque sélection (owned) d'un pays qui a joué le match et qui n'a PAS de ligne,
 * elle crée une ligne played=false (résultat de l'équipe) + le points_log
 * correspondant (Victoire +3 / Nul +1). Idempotent.
 *
 * Renvoie l'ensemble des participants affectés ; le recalcul des totaux est à la
 * charge de l'appelant (syncMatch le fait déjà, le backfill aussi).
 */

import type { createServiceClient } from './supabase-clients'
import { calculatePlayerPoints } from './scoring'
import type { Position, PlayerStats } from './types'

type SB = ReturnType<typeof createServiceClient>

// Nom d'équipe (matches.home_team/away_team) → valeur players.nationality quand
// les deux diffèrent. Seuls ces trois cas divergent dans le jeu de données.
const TEAM_TO_NATIONALITY: Record<string, string> = {
  'IR Iran': 'Iran',
  'Cabo Verde': 'Cape Verde Islands',
  "Côte d'Ivoire": 'Ivory Coast',
}

function sideResult(my: number, opp: number): 'win' | 'draw' | 'loss' {
  return my > opp ? 'win' : my === opp ? 'draw' : 'loss'
}

export async function applyAbsentTeamResultBonus(
  supabase: SB,
  matchId: string,
): Promise<Set<string>> {
  const affected = new Set<string>()

  const { data: m } = await supabase
    .from('matches')
    .select('id, home_team, away_team, home_score, away_score, status')
    .eq('id', matchId)
    .single()
  if (!m || m.status !== 'finished') return affected
  const hs = m.home_score as number | null
  const as = m.away_score as number | null
  if (hs == null || as == null) return affected

  // Joueurs ayant déjà une ligne pour ce match (joué ou banc listé par l'API).
  const { data: existing } = await supabase
    .from('player_stats')
    .select('player_id')
    .eq('match_id', matchId)
  const hasRow = new Set((existing ?? []).map((r) => r.player_id as string))

  const sides: Array<{ team: string; result: 'win' | 'draw' | 'loss' }> = [
    { team: m.home_team as string, result: sideResult(hs, as) },
    { team: m.away_team as string, result: sideResult(as, hs) },
  ]

  for (const side of sides) {
    const nationality = TEAM_TO_NATIONALITY[side.team] ?? side.team

    // Sélections (owned) de ce pays — join filtré sur la nationalité.
    const { data: picks } = await supabase
      .from('teams')
      .select('participant_id, player_id, players!inner(nationality, position)')
      .eq('players.nationality', nationality)

    for (const pick of (picks ?? []) as unknown as Array<{
      participant_id: string
      player_id: string
      players: { position: string } | null
    }>) {
      const playerId = pick.player_id
      if (hasRow.has(playerId)) continue // déjà une ligne → bonus déjà géré ailleurs
      const position = (pick.players?.position ?? 'MID') as Position

      // Ligne synthétique « non entré » porteuse du résultat de l'équipe.
      await supabase.from('player_stats').upsert(
        {
          player_id: playerId,
          match_id: matchId,
          played: false,
          result: side.result,
          goals: 0,
          assists: 0,
          motm: false,
          motm_proxy: false,
          motm_official: false,
          yellow_cards: 0,
          red_cards: 0,
          penalty_saved: 0,
          penalty_scored: 0,
          freekick_goal: 0,
          cleansheet: false,
          minutes: 0,
        },
        { onConflict: 'player_id,match_id' },
      )

      const stats: PlayerStats = {
        id: '',
        player_id: playerId,
        match_id: matchId,
        played: false,
        result: side.result,
        goals: 0,
        assists: 0,
        motm: false,
        yellow_cards: 0,
        red_cards: 0,
        penalty_saved: 0,
        penalty_scored: 0,
        freekick_goal: 0,
        cleansheet: false,
        minutes: 0,
      }
      const scoring = calculatePlayerPoints(stats, position)

      await supabase.from('points_log').upsert(
        {
          participant_id: pick.participant_id,
          player_id: playerId,
          match_id: matchId,
          points_breakdown: {
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
          },
          total_points: scoring.total,
        },
        { onConflict: 'participant_id,player_id,match_id' },
      )
      affected.add(pick.participant_id)
    }
  }

  return affected
}
