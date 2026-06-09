/**
 * types.ts — Interfaces TypeScript globales du projet.
 * Correspondent exactement au schéma BDD Supabase défini dans /supabase/schema.sql.
 */

// ---------------------------------------------------------------------------
// Primitives & enums
// ---------------------------------------------------------------------------

export type Position = 'GK' | 'DEF' | 'MID' | 'FWD'

export type MatchStatus = 'scheduled' | 'live' | 'finished'

export type MatchResult = 'win' | 'draw' | 'loss'

// ---------------------------------------------------------------------------
// Entités BDD
// ---------------------------------------------------------------------------

export interface Participant {
  id: string
  name: string
  avatar_url: string | null
  total_points: number
  created_at: string
}

export interface Player {
  id: string
  name: string
  nationality: string
  nationality_code: string
  position: Position
  photo_url: string | null
  api_football_id: number | null
}

export interface Team {
  id: string
  participant_id: string
  player_id: string
  slot: number
}

export interface Match {
  id: string
  api_match_id: number | null
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  date: string
  venue: string | null
  stage: string | null
  status: MatchStatus
  last_verified_at: string | null
  sync_attempts: number
}

export interface PlayerStats {
  id: string
  player_id: string
  match_id: string
  played: boolean
  result: MatchResult | null
  goals: number
  assists: number
  motm: boolean
  yellow_cards: number
  red_cards: number
  penalty_saved: number
  penalty_scored: number
  freekick_goal: number
  cleansheet: boolean
}

export interface PointsLog {
  id: string
  participant_id: string
  player_id: string
  match_id: string
  points_breakdown: PointsBreakdown
  total_points: number
  created_at: string
}

// ---------------------------------------------------------------------------
// Types utilitaires
// ---------------------------------------------------------------------------

/**
 * Détail de chaque bonus/malus stocké en JSONB dans points_log.points_breakdown.
 * Chaque champ vaut le nombre de points apporté par cette catégorie (peut être 0).
 */
export interface PointsBreakdown {
  // Résultat collectif
  win_bonus: number          // +3 si victoire
  draw_bonus: number         // +1 si nul

  // Buts (un seul des trois est non-nul pour un but donné)
  goal_position_bonus: number   // +25/+15/+10/+5 selon position (hors penalty, hors coup franc direct)
  goal_freekick_bonus: number   // +15 si but sur coup franc (cumulable avec goal_position_bonus)
  goal_penalty_bonus: number    // +5 si but sur penalty hors TAB (remplace goal_position_bonus)

  // Autres
  assist_bonus: number       // +3 par passe décisive
  motm_bonus: number         // +3 si homme du match
  cleansheet_bonus: number   // +5 si cleansheet (GK uniquement)
  penalty_saved_bonus: number // +5 par penalty arrêté

  // Malus
  red_card_malus: number     // -10 par carton rouge (valeur négative)
}

// ---------------------------------------------------------------------------
// Types enrichis (jointures fréquentes)
// ---------------------------------------------------------------------------

export interface TeamWithPlayer extends Team {
  player: Player
}

export interface ParticipantWithTeam extends Participant {
  team: TeamWithPlayer[]
}

export interface PlayerStatsWithMatch extends PlayerStats {
  match: Match
}

export interface PointsLogWithDetails extends PointsLog {
  player: Player
  match: Match
}
