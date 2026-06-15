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

/**
 * Parse une date de match en la traitant comme UTC.
 * Les dates sont stockées en colonne TIMESTAMP (naïves, sans fuseau) mais
 * représentent l'heure UTC. Sans 'Z', `new Date()` les interpréterait comme
 * heure locale → décalage. On ajoute 'Z' si aucun fuseau n'est présent.
 */
export function parseMatchDateUTC(date: string | Date): Date {
  if (date instanceof Date) return date
  const hasTz = /[zZ]$|[+-]\d\d:?\d\d$/.test(date)
  return new Date(hasTz ? date : date + 'Z')
}

/** "HH:mm" dans le fuseau du navigateur. Ex: "21:00". */
export function formatMatchTime(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parseMatchDateUTC(date))
}

/** Date courte localisée. Ex: "11 juin". */
export function formatMatchDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  }).format(parseMatchDateUTC(date))
}

/**
 * Date longue pour la chronique du soir. Ex: "jeudi 11 juin 2026".
 * recap_date est une date seule (YYYY-MM-DD, jour UTC des matchs) : on force
 * le fuseau UTC pour un rendu stable et identique serveur/navigateur.
 */
export function formatRecapDate(date: string): string {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? date + 'T00:00:00Z' : date)
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}
