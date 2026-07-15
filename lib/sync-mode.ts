/**
 * sync-mode.ts — Bascule entre les deux régimes de synchronisation.
 *
 * Le coût en requêtes API-Football diffère de deux ordres de grandeur :
 *
 *   'live'  — temps réel. Chaque match est sondé à la minute pendant sa fenêtre,
 *             plus un `/fixtures?live=all` à chaque cycle. ~2900 requêtes/jour.
 *             Exige un plan payant (le plan gratuit plafonne à 100/jour et n'a
 *             même pas accès à la saison 2026).
 *
 *   'final' — résultat final uniquement. Aucune requête tant qu'aucun match
 *             n'est censé terminé (coup d'envoi + 2h45) ; un match terminé n'est
 *             plus re-sondé. ~20 requêtes/jour. Le MOTM officiel publié
 *             tardivement reste rattrapé par la réconciliation FIFA, gratuite.
 *
 * Piloté par la variable d'environnement SYNC_MODE, pour basculer sans toucher
 * au code le jour où l'abonnement payant revient (SYNC_MODE=live sur Vercel).
 *
 * Défaut volontaire : 'final'. C'est le mode sûr — lancer le mode live sur un
 * plan gratuit vide le quota en moins d'une heure et fige tout le sync.
 */

export type SyncMode = 'live' | 'final'

export function getSyncMode(): SyncMode {
  return process.env.SYNC_MODE === 'live' ? 'live' : 'final'
}
