/**
 * scoring.ts — Moteur de calcul des points du Jeu de l'Entraîneur.
 *
 * Règles complètes définies dans PROJECT.md.
 * Toutes les fonctions sont pures : aucun effet de bord, aucune dépendance externe.
 */

import type { PlayerStats, Position, PointsBreakdown } from './types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScoringResult = PointsBreakdown & { total: number }

/** Entrée lisible pour l'affichage UI d'un breakdown (label FR + points). */
export interface BreakdownEntry {
  label: string
  points: number
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Bonus de position par but (hors penalty et TAB). */
const GOAL_POSITION_BONUS: Record<Position, number> = {
  GK: 25,
  DEF: 15,
  MID: 10,
  FWD: 5,
}

const FREEKICK_BONUS = 15
const PENALTY_GOAL_FLAT = 5   // remplace le bonus de position
const WIN_BONUS = 3
const DRAW_BONUS = 1
const ASSIST_BONUS = 3
const MOTM_BONUS = 3
const CLEANSHEET_BONUS = 5
const PENALTY_SAVED_BONUS = 5
const RED_CARD_MALUS = -10

// ---------------------------------------------------------------------------
// Fonction principale
// ---------------------------------------------------------------------------

/**
 * Calcule les points d'un joueur pour un match donné.
 *
 * Hypothèse sur les champs goals/freekick_goal/penalty_scored :
 *   goals = total des buts marqués dans le match
 *   freekick_goal ≤ goals : sous-ensemble marqué sur coup franc direct
 *   penalty_scored ≤ goals : sous-ensemble marqué sur penalty hors TAB
 *   goals - freekick_goal - penalty_scored = buts normaux (bonus position seul)
 *
 * Les buts en TAB ne rapportent aucun point individuel (seuls les penalties
 * arrêtés comptent, via penalty_saved).
 */
export function calculatePlayerPoints(
  stats: PlayerStats,
  position: Position,
): ScoringResult {
  if (!stats.played) {
    return {
      win_bonus: 0,
      draw_bonus: 0,
      goal_position_bonus: 0,
      goal_freekick_bonus: 0,
      goal_penalty_bonus: 0,
      assist_bonus: 0,
      motm_bonus: 0,
      cleansheet_bonus: 0,
      penalty_saved_bonus: 0,
      red_card_malus: 0,
      total: 0,
    }
  }

  // --- Résultat collectif ---
  const win_bonus = stats.result === 'win' ? WIN_BONUS : 0
  const draw_bonus = stats.result === 'draw' ? DRAW_BONUS : 0

  // --- Buts ---
  // Buts normaux = total - coup franc - penalty (chacun traité séparément)
  const normalGoals = stats.goals - stats.freekick_goal - stats.penalty_scored

  // Bonus de position : buts normaux + buts sur coup franc (les deux l'obtiennent)
  const goal_position_bonus =
    (normalGoals + stats.freekick_goal) * GOAL_POSITION_BONUS[position]

  // Bonus coup franc additionnel (cumulable avec le bonus de position)
  const goal_freekick_bonus = stats.freekick_goal * FREEKICK_BONUS

  // Buts sur penalty : +5 flat, sans bonus de position
  const goal_penalty_bonus = stats.penalty_scored * PENALTY_GOAL_FLAT

  // --- Autres performances ---
  const assist_bonus = stats.assists * ASSIST_BONUS
  const motm_bonus = stats.motm ? MOTM_BONUS : 0

  // Cleansheet uniquement pour les gardiens
  const cleansheet_bonus =
    position === 'GK' && stats.cleansheet ? CLEANSHEET_BONUS : 0

  const penalty_saved_bonus = stats.penalty_saved * PENALTY_SAVED_BONUS
  const red_card_malus = stats.red_cards * RED_CARD_MALUS

  const total =
    win_bonus +
    draw_bonus +
    goal_position_bonus +
    goal_freekick_bonus +
    goal_penalty_bonus +
    assist_bonus +
    motm_bonus +
    cleansheet_bonus +
    penalty_saved_bonus +
    red_card_malus

  return {
    win_bonus,
    draw_bonus,
    goal_position_bonus,
    goal_freekick_bonus,
    goal_penalty_bonus,
    assist_bonus,
    motm_bonus,
    cleansheet_bonus,
    penalty_saved_bonus,
    red_card_malus,
    total,
  }
}

// ---------------------------------------------------------------------------
// Utilitaire d'affichage
// ---------------------------------------------------------------------------

/** Labels lisibles en français pour chaque clé de PointsBreakdown. */
export const BREAKDOWN_LABELS: Record<keyof PointsBreakdown, string> = {
  win_bonus: 'Victoire',
  draw_bonus: 'Match nul',
  goal_position_bonus: 'But (bonus position)',
  goal_freekick_bonus: 'But coup franc',
  goal_penalty_bonus: 'But sur penalty',
  assist_bonus: 'Passe décisive',
  motm_bonus: 'Homme du match',
  cleansheet_bonus: 'Clean sheet',
  penalty_saved_bonus: 'Penalty arrêté',
  red_card_malus: 'Carton rouge',
}

/**
 * Convertit un PointsBreakdown en tableau de BreakdownEntry.
 * N'inclut que les entrées non nulles pour l'affichage.
 */
export function formatBreakdown(breakdown: PointsBreakdown): BreakdownEntry[] {
  return (Object.keys(BREAKDOWN_LABELS) as Array<keyof PointsBreakdown>)
    .filter((key) => breakdown[key] !== 0)
    .map((key) => ({ label: BREAKDOWN_LABELS[key], points: breakdown[key] }))
}
