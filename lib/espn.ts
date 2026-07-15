/**
 * espn.ts — Source de stats de repli, gratuite et sans clé : l'API publique ESPN.
 *
 * Pourquoi : le plan API-Football gratuit n'a aucun accès à la saison 2026, et le
 * flux FIFA ne donne que le score et l'homme du match — ni buteurs ni passeurs.
 * ESPN publie la feuille de match complète de la CdM (`soccer/fifa.world`), sans
 * authentification ni quota.
 *
 *   /scoreboard?dates=YYYYMMDD  → les matchs du jour (id, équipes, statut)
 *   /summary?event={id}         → rosters (stats par joueur) + keyEvents (timeline)
 *
 * Répartition des sources, vérifiée sur les 102 matchs du tournoi :
 *
 *   - `rosters[].roster[].stats` donne totalGoals / goalAssists / yellowCards /
 *     redCards / goalsConceded. C'est la source des compteurs : plus fiable que
 *     de recompter des événements.
 *     ⚠️ totalGoals exclut les CSC ET les tirs au but — exactement le contrat de
 *     scoring.ts (un but en TAB ne rapporte rien, un CSC non plus). Vérifié sur
 *     Australie-Égypte : 1-1 (TAB 2-4) mais sommes totalGoals = 0 et 1, le but
 *     australien étant un CSC égyptien.
 *
 *   - `keyEvents` sert UNIQUEMENT à qualifier les buts que les compteurs ne
 *     distinguent pas :
 *       "Goal", "Goal - Header", "Goal - Volley" → but normal (bonus de position)
 *       "Goal - Free-kick"  → coup franc direct (+15, cumulable)
 *       "Penalty - Scored"  → penalty en jeu (+5, remplace le bonus de position)
 *       "Penalty - Saved"   → +5 au GARDIEN
 *       "Own Goal"          → ignoré (aucun point au barème)
 *     Aucun événement `shootout: true` n'existe sur tout le tournoi : les tirs au
 *     but ne sont jamais listés, donc tout "Penalty - Scored" est un penalty en
 *     jeu. Corollaire : les penalties arrêtés en séance de TAB restent hors de
 *     portée — même limite que le chemin API-Football.
 */

import { getCountryCode } from './flags'
import { parseMatchDateUTC } from './datetime'

const ESPN_API = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'

export interface EspnPlayerStat {
  name: string
  team: string
  position: string // 'G' | 'D' | 'M' | 'F' (abréviation ESPN)
  played: boolean
  goals: number // total hors CSC et hors TAB (penalties et coups francs inclus)
  assists: number
  penaltyScored: number // sous-ensemble de goals : penalties en jeu
  freekickGoal: number // sous-ensemble de goals : coups francs directs
  penaltySaved: number // gardien uniquement
  yellowCards: number
  redCards: number
  cleansheet: boolean
}

export interface EspnMatch {
  eventId: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  finished: boolean
  players: EspnPlayerStat[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any

async function espnFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${ESPN_API}${path}`, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`ESPN ${path} → HTTP ${res.status}`)
  return res.json() as Promise<T>
}

function statOf(player: Json, name: string): number {
  const s = (player.stats ?? []).find((x: Json) => x.name === name)
  return Number(s?.value ?? 0)
}

/** "…saved in the bottom right corner by Mike Maignan (France)." → "Mike Maignan" */
export function parseSavedPenaltyKeeper(text: string): string | null {
  const m = /\bby\s+([^()]+?)\s*\(/i.exec(text ?? '')
  return m ? m[1].trim() : null
}

/** Type d'événement ESPN → qualification du but pour le barème. */
export function goalKind(typeText: string): 'normal' | 'freekick' | 'penalty' | 'own' | null {
  const t = (typeText ?? '').toLowerCase()
  if (t === 'own goal') return 'own'
  if (t === 'penalty - scored') return 'penalty'
  if (t.startsWith('goal - free')) return 'freekick'
  if (t === 'goal' || t.startsWith('goal - ')) return 'normal'
  return null
}

/** Formate une date en YYYYMMDD (UTC) pour le scoreboard ESPN. */
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

/**
 * Retrouve l'event ESPN d'un match par date + équipes (comparées par code pays,
 * pour absorber les écarts de nommage). Balaie J-1/J/J+1 : nos dates stockées
 * peuvent être décalées de quelques heures et un match nocturne bascule de jour.
 */
export async function findEspnEventId(
  dateIso: string,
  homeTeam: string,
  awayTeam: string,
): Promise<string | null> {
  const target = [getCountryCode(homeTeam), getCountryCode(awayTeam)].filter(Boolean).sort()
  if (target.length !== 2) return null

  // ⚠️ Les dates matches sont des TIMESTAMP naïfs représentant de l'UTC :
  // new Date() les lirait en heure locale (cf. datetime.ts).
  const base = parseMatchDateUTC(dateIso)
  for (const offset of [0, -1, 1]) {
    const d = new Date(base.getTime() + offset * 86400_000)
    let sb: Json
    try {
      sb = await espnFetch<Json>(`/scoreboard?dates=${ymd(d)}`)
    } catch {
      continue
    }
    for (const ev of sb.events ?? []) {
      const comps = ev.competitions?.[0]?.competitors ?? []
      const codes = comps
        .map((c: Json) => getCountryCode(c.team?.displayName ?? ''))
        .filter(Boolean)
        .sort()
      if (codes.length === 2 && codes[0] === target[0] && codes[1] === target[1]) {
        return String(ev.id)
      }
    }
  }
  return null
}

export interface EspnFixture {
  eventId: string
  homeTeam: string
  awayTeam: string
  kickoff: string
}

/**
 * Affiche d'un match à venir, retrouvée par HORAIRE de coup d'envoi.
 *
 * Sert à résoudre le calendrier : tant qu'un slot de phase finale est "TBD", on
 * n'a aucun nom d'équipe pour l'identifier — seule la date fait clé. ESPN publie
 * l'affiche dès que les qualifiés sont connus, là où le flux FIFA s'en tient à
 * "Winner match 101 v Winner match 102".
 *
 * Tolérance de 90 min autour du coup d'envoi : nos horaires stockés collent à la
 * minute sur la phase finale, mais on absorbe un éventuel ajustement.
 */
export async function findEspnFixtureByKickoff(
  dateIso: string,
  toleranceMs = 90 * 60 * 1000,
): Promise<EspnFixture | null> {
  // Idem : sans parseMatchDateUTC, un décalage de fuseau ferait rater la
  // tolérance et aucune affiche ne serait résolue.
  const target = parseMatchDateUTC(dateIso).getTime()
  let best: { fx: EspnFixture; delta: number } | null = null

  for (const offset of [0, -1, 1]) {
    const d = new Date(target + offset * 86400_000)
    let sb: Json
    try {
      sb = await espnFetch<Json>(`/scoreboard?dates=${ymd(d)}`)
    } catch {
      continue
    }
    for (const ev of sb.events ?? []) {
      const comp = ev.competitions?.[0]
      const home = (comp?.competitors ?? []).find((c: Json) => c.homeAway === 'home')
      const away = (comp?.competitors ?? []).find((c: Json) => c.homeAway === 'away')
      const homeName = home?.team?.displayName
      const awayName = away?.team?.displayName
      if (!homeName || !awayName || !ev.date) continue
      const delta = Math.abs(new Date(ev.date).getTime() - target)
      if (delta > toleranceMs) continue
      if (!best || delta < best.delta) {
        best = {
          delta,
          fx: { eventId: String(ev.id), homeTeam: homeName, awayTeam: awayName, kickoff: ev.date },
        }
      }
    }
  }
  return best?.fx ?? null
}

/** Feuille de match complète : compteurs par joueur + qualification des buts. */
export async function fetchEspnMatch(eventId: string): Promise<EspnMatch> {
  const j = await espnFetch<Json>(`/summary?event=${eventId}`)

  const comp = j.header?.competitions?.[0]
  const competitors = comp?.competitors ?? []
  const homeC = competitors.find((c: Json) => c.homeAway === 'home')
  const awayC = competitors.find((c: Json) => c.homeAway === 'away')
  const finished = Boolean(comp?.status?.type?.completed)

  // Qualification des buts depuis la timeline, par nom de joueur.
  const penaltyByPlayer = new Map<string, number>()
  const freekickByPlayer = new Map<string, number>()
  const savedByKeeper = new Map<string, number>()
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1)

  for (const e of j.keyEvents ?? []) {
    const typeText = e.type?.text ?? ''
    if (typeText === 'Penalty - Saved') {
      const keeper = parseSavedPenaltyKeeper(e.text ?? '')
      if (keeper) bump(savedByKeeper, keeper)
      continue
    }
    const kind = goalKind(typeText)
    if (!kind || kind === 'own') continue
    const scorer = e.participants?.[0]?.athlete?.displayName
    if (!scorer) continue
    if (kind === 'penalty') bump(penaltyByPlayer, scorer)
    else if (kind === 'freekick') bump(freekickByPlayer, scorer)
  }

  const players: EspnPlayerStat[] = []
  for (const t of j.rosters ?? []) {
    const team = t.team?.displayName ?? ''
    for (const p of t.roster ?? []) {
      const name = p.athlete?.displayName
      if (!name) continue
      const position = p.position?.abbreviation ?? ''
      const played = Boolean(p.starter) || Boolean(p.subbedIn)
      const conceded = statOf(p, 'goalsConceded')
      players.push({
        name,
        team,
        position,
        played,
        goals: statOf(p, 'totalGoals'),
        assists: statOf(p, 'goalAssists'),
        penaltyScored: penaltyByPlayer.get(name) ?? 0,
        freekickGoal: freekickByPlayer.get(name) ?? 0,
        penaltySaved: savedByKeeper.get(name) ?? 0,
        yellowCards: statOf(p, 'yellowCards'),
        redCards: statOf(p, 'redCards'),
        cleansheet: position === 'G' && played && conceded === 0,
      })
    }
  }

  return {
    eventId,
    homeTeam: homeC?.team?.displayName ?? '',
    awayTeam: awayC?.team?.displayName ?? '',
    homeScore: Number(homeC?.score ?? 0),
    awayScore: Number(awayC?.score ?? 0),
    finished,
    players,
  }
}
