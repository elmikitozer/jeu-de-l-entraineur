/**
 * datetime.ts — Formatage horaire unifié.
 *
 * Les matchs sont stockés en UTC. On affiche TOUJOURS dans le fuseau du
 * navigateur via Intl.DateTimeFormat, de façon identique sur toutes les pages
 * (accueil + calendrier) pour éviter les divergences home/calendrier.
 *
 * ⚠️ Ces fonctions dépendent du fuseau local : à n'utiliser que côté client
 * (composant LocalTime / LocalDate) pour garantir l'heure du visiteur.
 */

/** "HH:mm" dans le fuseau du navigateur. Ex: "21:00". */
export function formatMatchTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/** Date courte localisée. Ex: "11 juin". */
export function formatMatchDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  }).format(d)
}
