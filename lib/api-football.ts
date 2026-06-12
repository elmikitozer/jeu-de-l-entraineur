/**
 * api-football.ts — Wrapper pour l'API-Football v3 via RapidAPI.
 *
 * Trois fonctions exposées :
 *   fetchLiveMatchStats   → stats dérivées des événements en cours de match
 *   fetchFinalMatchStats  → stats définitives après le match
 *   fetchFixtureResult    → score + statut du match
 */

// ── Types publics ────────────────────────────────────────────────────────────

export interface RawPlayerStats {
  playerId: number          // api_football_id
  goals: number
  assists: number
  motm: boolean
  yellowCards: number
  redCards: number
  penaltySaved: number
  penaltyScored: number     // hors TAB
  freekickGoal: number
  cleansheet: boolean       // GK uniquement : 0 but concédé
  played: boolean
  result: 'win' | 'draw' | 'loss'
}

export interface FixtureResult {
  homeScore: number
  awayScore: number
  status: string            // "NS", "1H", "HT", "2H", "ET", "FT", "AET", "PEN", etc.
}

// ── Types internes (réponses API-Football) ───────────────────────────────────

interface AF_Event {
  time: { elapsed: number; extra: number | null }
  team: { id: number; name: string }
  player: { id: number; name: string }
  assist: { id: number | null; name: string | null }
  type: string    // "Goal" | "Card" | "subst" | "Var"
  detail: string  // "Normal Goal" | "Penalty" | "Free Kick" | "Own Goal" | "Yellow Card" | "Red Card" | ...
}

interface AF_LineupPlayer {
  player: { id: number; name: string; number: number; pos: string }
}

interface AF_Fixture {
  fixture: {
    id: number
    status: { short: string; elapsed: number | null }
  }
  teams: {
    home: { id: number; name: string; winner: boolean | null }
    away: { id: number; name: string; winner: boolean | null }
  }
  goals: { home: number | null; away: number | null }
  events?: AF_Event[]
  lineups?: Array<{
    team: { id: number; name: string }
    startXI: AF_LineupPlayer[]
    substitutes: AF_LineupPlayer[]
  }>
}

interface AF_FixtureResponse {
  response: AF_Fixture[]
}

interface AF_PlayerStatistics {
  games: {
    minutes: number | null
    position: string    // "G" | "D" | "M" | "F"
    rating: string | null
    substitute: boolean
  }
  goals: {
    total: number | null
    conceded: number | null
    assists: number | null
    saves: number | null
  }
  cards: { yellow: number; yellowred: number; red: number }
  penalty: {
    scored: number
    missed: number
    saved: number | null
  }
}

interface AF_PlayerStat {
  player: { id: number; name: string }
  statistics: AF_PlayerStatistics[]
}

interface AF_PlayersResponse {
  response: Array<{
    team: { id: number; name: string }
    players: AF_PlayerStat[]
  }>
}

// ── Client HTTP ──────────────────────────────────────────────────────────────

// Accès DIRECT API-Sports (et non RapidAPI) : c'est l'abonnement Pro de l'utilisateur
// (dashboard.api-football.com). Header d'auth : x-apisports-key.
// Le host v3.football.api-sports.io implique déjà /v3, donc les chemins restent
// /fixtures, /fixtures/players, /status sans préfixe.
const BASE_URL = process.env.API_FOOTBALL_URL ?? 'https://v3.football.api-sports.io'

function getHeaders(): HeadersInit {
  return {
    // RAPIDAPI_KEY contient en réalité la clé directe API-Sports (nom historique).
    'x-apisports-key': process.env.API_FOOTBALL_KEY ?? process.env.RAPIDAPI_KEY ?? '',
  }
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: getHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`API-Football ${path} → HTTP ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

// ── Helpers partagés ────────────────────────────────────────────────────────

/**
 * Détermine win/draw/loss pour chaque équipe à partir des résultats du match.
 * Si winner=null (match en cours), utilise le score actuel.
 */
function resolveTeamResults(
  homeTeamId: number,
  awayTeamId: number,
  homeWinner: boolean | null,
  awayWinner: boolean | null,
  homeGoals: number,
  awayGoals: number,
): Record<number, 'win' | 'draw' | 'loss'> {
  const results: Record<number, 'win' | 'draw' | 'loss'> = {}

  if (homeWinner === true) {
    results[homeTeamId] = 'win'
    results[awayTeamId] = 'loss'
  } else if (awayWinner === true) {
    results[homeTeamId] = 'loss'
    results[awayTeamId] = 'win'
  } else if (homeGoals > awayGoals) {
    results[homeTeamId] = 'win'
    results[awayTeamId] = 'loss'
  } else if (awayGoals > homeGoals) {
    results[homeTeamId] = 'loss'
    results[awayTeamId] = 'win'
  } else {
    results[homeTeamId] = 'draw'
    results[awayTeamId] = 'draw'
  }

  return results
}

/**
 * Construit les stats par joueur à partir des événements d'un match.
 * Utilisé pour fetchLiveMatchStats (évènements en temps réel).
 */
function buildStatsFromEvents(fixture: AF_Fixture): RawPlayerStats[] {
  const homeTeamId = fixture.teams.home.id
  const awayTeamId = fixture.teams.away.id
  const homeGoals = fixture.goals.home ?? 0
  const awayGoals = fixture.goals.away ?? 0

  const teamResults = resolveTeamResults(
    homeTeamId, awayTeamId,
    fixture.teams.home.winner, fixture.teams.away.winner,
    homeGoals, awayGoals,
  )

  // Joueurs en jeu (starters + entrants)
  const playedIds = new Set<number>()
  const playerTeam = new Map<number, number>() // playerId → teamId

  for (const lineup of (fixture.lineups ?? [])) {
    for (const { player } of lineup.startXI) {
      playedIds.add(player.id)
      playerTeam.set(player.id, lineup.team.id)
    }
  }

  // Intégrer les entrées en jeu depuis les events substitution
  for (const event of (fixture.events ?? [])) {
    if (event.type === 'subst') {
      playedIds.add(event.assist.id ?? event.player.id)
      playerTeam.set(event.assist.id ?? event.player.id, event.team.id)
    }
  }

  // Accumulation des stats par événement
  type MutableStats = {
    goals: number; assists: number; yellowCards: number; redCards: number
    penaltyScored: number; freekickGoal: number; teamId: number
  }
  const statsMap = new Map<number, MutableStats>()

  function ensurePlayer(pid: number, teamId: number): MutableStats {
    if (!statsMap.has(pid)) {
      statsMap.set(pid, { goals: 0, assists: 0, yellowCards: 0, redCards: 0, penaltyScored: 0, freekickGoal: 0, teamId })
      playedIds.add(pid)
      playerTeam.set(pid, teamId)
    }
    return statsMap.get(pid)!
  }

  for (const event of (fixture.events ?? [])) {
    if (event.type === 'Goal' && event.detail !== 'Own Goal') {
      const s = ensurePlayer(event.player.id, event.team.id)
      s.goals++
      if (event.detail === 'Penalty') s.penaltyScored++
      if (event.detail === 'Free Kick') s.freekickGoal++
      // Passe décisive
      if (event.assist.id) {
        const a = ensurePlayer(event.assist.id, event.team.id)
        a.assists++
      }
    } else if (event.type === 'Card') {
      const s = ensurePlayer(event.player.id, event.team.id)
      if (event.detail === 'Yellow Card') s.yellowCards++
      else if (event.detail === 'Red Card' || event.detail === 'Second Yellow card') s.redCards++
    }
  }

  const result: RawPlayerStats[] = []

  for (const pid of Array.from(playedIds)) {
    const teamId = playerTeam.get(pid) ?? homeTeamId
    const s = statsMap.get(pid)
    const isHomeTeam = teamId === homeTeamId
    const conceded = isHomeTeam ? awayGoals : homeGoals

    result.push({
      playerId: pid,
      goals: s?.goals ?? 0,
      assists: s?.assists ?? 0,
      motm: false,
      yellowCards: s?.yellowCards ?? 0,
      redCards: s?.redCards ?? 0,
      penaltySaved: 0,                          // non disponible depuis les events
      penaltyScored: s?.penaltyScored ?? 0,
      freekickGoal: s?.freekickGoal ?? 0,
      cleansheet: conceded === 0,               // le sync final corrigera pour les GK uniquement
      played: true,
      result: teamResults[teamId] ?? 'draw',
    })
  }

  return result
}

// ── API publiques ────────────────────────────────────────────────────────────

/**
 * Stats en temps réel dérivées des événements (buts, cartons, assists).
 * Utilise le endpoint live — retourne [] si le match n'est pas en cours.
 */
export async function fetchLiveMatchStats(apiMatchId: number): Promise<RawPlayerStats[]> {
  // ⚠️ NE PAS utiliser `&live=all` avec `id=` : combinaison invalide → HTTP 404.
  // `/fixtures?id=X` renvoie le fixture complet (events + statut) qu'il soit en
  // cours ou terminé, ce qui suffit pour buildStatsFromEvents.
  const data = await apiFetch<AF_FixtureResponse>(`/fixtures?id=${apiMatchId}`)
  const fixture = data.response?.[0]
  if (!fixture) return []
  return buildStatsFromEvents(fixture)
}

/**
 * Stats définitives après le match, depuis /fixtures/players.
 * Plus précis que le mode live : inclut minutes, rating, penalty saved, etc.
 */
export async function fetchFinalMatchStats(apiMatchId: number): Promise<RawPlayerStats[]> {
  const [playersData, fixtureData] = await Promise.all([
    apiFetch<AF_PlayersResponse>(`/fixtures/players?fixture=${apiMatchId}`),
    apiFetch<AF_FixtureResponse>(`/fixtures?id=${apiMatchId}`),
  ])

  const fixture = fixtureData.response?.[0]
  if (!fixture || !playersData.response?.length) return []

  const homeTeamId = fixture.teams.home.id
  const awayTeamId = fixture.teams.away.id
  const homeGoals = fixture.goals.home ?? 0
  const awayGoals = fixture.goals.away ?? 0

  const teamResults = resolveTeamResults(
    homeTeamId, awayTeamId,
    fixture.teams.home.winner, fixture.teams.away.winner,
    homeGoals, awayGoals,
  )

  // Buts sur coup franc depuis les events (non présent dans /fixtures/players)
  const freekickGoalsByPlayer: Record<number, number> = {}
  for (const event of (fixture.events ?? [])) {
    if (event.type === 'Goal' && event.detail === 'Free Kick') {
      freekickGoalsByPlayer[event.player.id] = (freekickGoalsByPlayer[event.player.id] ?? 0) + 1
    }
  }

  // Déterminer le MOTM par le rating le plus élevé
  let maxRating = 0
  let motmPlayerId: number | null = null

  for (const teamData of playersData.response) {
    for (const { player, statistics } of teamData.players) {
      const rating = parseFloat(statistics[0]?.games?.rating ?? '0') || 0
      if (rating > maxRating) {
        maxRating = rating
        motmPlayerId = player.id
      }
    }
  }

  const result: RawPlayerStats[] = []

  for (const teamData of playersData.response) {
    const teamId = teamData.team.id
    const isHomeTeam = teamId === homeTeamId
    const conceded = isHomeTeam ? awayGoals : homeGoals

    for (const { player, statistics } of teamData.players) {
      const stats = statistics[0]
      if (!stats) continue

      const minutes = stats.games.minutes ?? 0
      const position = stats.games.position  // "G" | "D" | "M" | "F"
      const isGK = position === 'G' || position === 'GK'

      result.push({
        playerId: player.id,
        goals: stats.goals.total ?? 0,
        assists: stats.goals.assists ?? 0,
        motm: player.id === motmPlayerId,
        yellowCards: stats.cards.yellow ?? 0,
        redCards: (stats.cards.red ?? 0) + (stats.cards.yellowred ?? 0),
        penaltySaved: stats.penalty.saved ?? 0,
        penaltyScored: stats.penalty.scored ?? 0,
        freekickGoal: freekickGoalsByPlayer[player.id] ?? 0,
        cleansheet: isGK && conceded === 0 && minutes > 0,
        played: minutes > 0,
        result: teamResults[teamId] ?? 'draw',
      })
    }
  }

  return result
}

// ID de la ligue Coupe du Monde dans API-Football.
const WORLD_CUP_LEAGUE_ID = 1

/**
 * Renvoie l'ensemble des api_match_id actuellement EN COURS pour la CdM.
 * Source de vérité robuste pour la détection live : indépendante des horaires
 * stockés en base (qui peuvent être faux). Une seule requête.
 */
export async function fetchLiveFixtureIds(): Promise<Set<number>> {
  const data = await apiFetch<AF_FixtureResponse>('/fixtures?live=all')
  const ids = new Set<number>()
  for (const fx of data.response ?? []) {
    const league = (fx as unknown as { league?: { id?: number } }).league
    if (league?.id === WORLD_CUP_LEAGUE_ID) {
      ids.add(fx.fixture.id)
    }
  }
  return ids
}

/**
 * Score et statut actuel d'un match (pour mise à jour de la table matches).
 */
export async function fetchFixtureResult(apiMatchId: number): Promise<FixtureResult> {
  const data = await apiFetch<AF_FixtureResponse>(`/fixtures?id=${apiMatchId}`)
  const fixture = data.response?.[0]
  if (!fixture) throw new Error(`Fixture ${apiMatchId} introuvable`)
  return {
    homeScore: fixture.goals.home ?? 0,
    awayScore: fixture.goals.away ?? 0,
    status: fixture.fixture.status.short,
  }
}
