/**
 * queries.ts — Fonctions Supabase pour les pages publiques.
 * Toutes les requêtes utilisent la clé anon (données publiques, RLS read-only).
 * createClient sans generic pour éviter les erreurs TS d'inférence (pattern projet).
 */

import { createClient } from '@supabase/supabase-js'
import type { Match, Player, Participant, PointsBreakdown, Position } from './types'
import { calculatePlayerPoints } from './scoring'

// Préférer la service role key (server-side uniquement) pour contourner
// tout problème de permissions RLS / anon key manquante.
// queries.ts n'est appelé que depuis des Server Components — jamais côté client.
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ── Types exportés ────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  id: string
  name: string
  total_points: number
  rank: number
  delta: number  // pts gagnés dans les dernières 24h
}

export interface PlayerWithPoints extends Player {
  points: number
  isLive: boolean
}

export interface TeamLine {
  label: 'Attaque' | 'Milieu' | 'Défense' | 'Gardien'
  players: PlayerWithPoints[]
}

export interface ParticipantTeamData {
  participant: Participant
  rank: number
  delta: number
  lines: TeamLine[]
}

export interface PlayerMatchEntry {
  match_id: string
  match_date: string
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  stage: string | null
  status: string
  played: boolean
  result: string | null
  goals: number
  assists: number
  motm: boolean
  total_points: number
  breakdown: PointsBreakdown
  cumulative_points: number
}

export interface PlayerStats5 {
  player: Pick<Player, 'id' | 'name' | 'nationality' | 'nationality_code' | 'position'>
  count: number
}

export interface GlobalStats {
  totalParticipants: number
  totalPrize: number
  prizeFirst: number
  prizeSecond: number
  prizeThird: number
  topScorers: PlayerStats5[]
  topAssists: PlayerStats5[]
  mostRentable: { player: Pick<Player, 'id' | 'name' | 'nationality' | 'nationality_code' | 'position'>; avg: number; matchCount: number }[]
  mostRegular: { participant: Pick<Participant, 'id' | 'name' | 'total_points'>; matchCount: number } | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Récupère TOUTES les lignes d'une table, en contournant le plafond PostgREST
 * de 1000 lignes par requête (sinon `players` (>1200), `player_stats` et
 * `points_log` sont silencieusement tronqués au fil du tournoi).
 */
async function fetchAll<T>(
  supabase: ReturnType<typeof getClient>,
  table: string,
  columns: string
): Promise<T[]> {
  const PAGE = 1000
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE - 1)
    if (error) {
      console.error(`[fetchAll ${table}]`, error.message)
      break
    }
    if (!data || data.length === 0) break
    rows.push(...(data as unknown as T[]))
    if (data.length < PAGE) break
  }
  return rows
}

/** Détermine la ligne (Attaque/Milieu/Défense/Gardien) depuis le slot 1-11. */
function slotToLine(slot: number): TeamLine['label'] {
  if (slot === 1) return 'Gardien'
  if (slot <= 5) return 'Défense'
  if (slot <= 8) return 'Milieu'
  return 'Attaque'
}

// ── getLeaderboard ────────────────────────────────────────────────────────────

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = getClient()

  const yesterday = new Date(Date.now() - 86_400_000).toISOString()

  const [{ data: participants }, { data: recentLogs }] = await Promise.all([
    supabase
      .from('participants')
      .select('id, name, total_points')
      .order('total_points', { ascending: false }),
    supabase
      .from('points_log')
      .select('participant_id, total_points')
      .gte('created_at', yesterday),
  ])

  const deltaMap = new Map<string, number>()
  for (const log of recentLogs ?? []) {
    const pid = log.participant_id as string
    const pts = (log.total_points as number) || 0
    deltaMap.set(pid, (deltaMap.get(pid) ?? 0) + pts)
  }

  return (participants ?? []).map((p, i) => ({
    id: p.id as string,
    name: p.name as string,
    total_points: (p.total_points as number) || 0,
    rank: i + 1,
    delta: deltaMap.get(p.id as string) ?? 0,
  }))
}

// ── getParticipantWithTeam ────────────────────────────────────────────────────

export async function getParticipantWithTeam(participantId: string): Promise<ParticipantTeamData | null> {
  const supabase = getClient()

  // 1. Participant + rang dans le leaderboard
  const [{ data: participantRow }, { data: allParticipants }, { data: teamRows }, { data: liveMatches }] =
    await Promise.all([
      supabase
        .from('participants')
        .select('id, name, avatar_url, total_points, created_at')
        .eq('id', participantId)
        .single(),
      supabase
        .from('participants')
        .select('id, total_points')
        .order('total_points', { ascending: false }),
      supabase
        .from('teams')
        .select('slot, player_id, players(id, name, nationality, nationality_code, position, photo_url, api_football_id)')
        .eq('participant_id', participantId),
      supabase
        .from('matches')
        .select('home_team, away_team')
        .eq('status', 'live'),
    ])

  if (!participantRow) return null

  // Rang
  const rank = ((allParticipants ?? []) as Array<{ id: string; total_points: number }>)
    .findIndex((p) => p.id === participantId) + 1

  // Natios en live
  const liveNationalities = new Set<string>()
  for (const m of liveMatches ?? []) {
    liveNationalities.add(m.home_team as string)
    liveNationalities.add(m.away_team as string)
  }

  // Points par joueur pour ce participant
  const { data: playerLogs } = await supabase
    .from('points_log')
    .select('player_id, total_points')
    .eq('participant_id', participantId)

  const playerPoints = new Map<string, number>()
  for (const log of playerLogs ?? []) {
    const pid = log.player_id as string
    const pts = (log.total_points as number) || 0
    playerPoints.set(pid, (playerPoints.get(pid) ?? 0) + pts)
  }

  // Delta (dernières 24h)
  const yesterday = new Date(Date.now() - 86_400_000).toISOString()
  const { data: recentLogs } = await supabase
    .from('points_log')
    .select('total_points')
    .eq('participant_id', participantId)
    .gte('created_at', yesterday)

  const delta = (recentLogs ?? []).reduce((s, r) => s + ((r.total_points as number) || 0), 0)

  // Organisation par lignes
  type RawTeamEntry = { slot: number; player_id: string; players: Player | null }
  const entries = (teamRows ?? []) as unknown as RawTeamEntry[]

  const lineMap = new Map<TeamLine['label'], PlayerWithPoints[]>([
    ['Attaque', []],
    ['Milieu', []],
    ['Défense', []],
    ['Gardien', []],
  ])

  for (const entry of entries) {
    if (!entry.players) continue
    const label = slotToLine(entry.slot)
    const line = lineMap.get(label)!
    line.push({
      ...entry.players,
      points: playerPoints.get(entry.players.id) ?? 0,
      isLive: liveNationalities.has(entry.players.nationality),
    })
  }

  // Trier chaque ligne par slot pour cohérence visuelle
  const lines: TeamLine[] = Array.from(lineMap.entries()).map(([label, players]) => ({
    label,
    players,
  }))

  return {
    participant: participantRow as unknown as Participant,
    rank,
    delta,
    lines,
  }
}

// ── getPlayerHistory ──────────────────────────────────────────────────────────

export async function getPlayerHistory(playerId: string): Promise<{ player: Player | null; history: PlayerMatchEntry[] }> {
  const supabase = getClient()

  // NB : player_stats n'est PAS embarqué depuis points_log (aucune FK directe
  // entre les deux tables → PostgREST renvoie "Could not find a relationship"
  // et toute la requête échoue). On le récupère séparément et on joint par match_id.
  const [{ data: playerRow }, { data: logs, error: logsErr }, { data: stats, error: statsErr }] = await Promise.all([
    supabase
      .from('players')
      .select('id, name, nationality, nationality_code, position, photo_url, api_football_id')
      .eq('id', playerId)
      .single(),
    supabase
      .from('points_log')
      .select('match_id, total_points, points_breakdown, matches(id, date, home_team, away_team, home_score, away_score, stage, status)')
      .eq('player_id', playerId),
    supabase
      .from('player_stats')
      .select('match_id, played, result, goals, assists, motm')
      .eq('player_id', playerId),
  ])

  if (logsErr) console.error('[getPlayerHistory] points_log', logsErr.message)
  if (statsErr) console.error('[getPlayerHistory] player_stats', statsErr.message)

  if (!logs?.length) {
    return { player: playerRow as unknown as Player | null, history: [] }
  }

  type RawLog = {
    match_id: string
    total_points: number
    points_breakdown: unknown
    matches: Pick<Match, 'date' | 'home_team' | 'away_team' | 'home_score' | 'away_score' | 'stage' | 'status'> | null
  }

  // Stats individuelles indexées par match
  type RawStat = { match_id: string; played: boolean; result: string | null; goals: number; assists: number; motm: boolean }
  const statsByMatch = new Map<string, RawStat>()
  for (const s of (stats ?? []) as unknown as RawStat[]) {
    statsByMatch.set(s.match_id, s)
  }

  // Un joueur sélectionné par plusieurs participants génère N lignes points_log
  // IDENTIQUES (même match → mêmes points). On déduplique par match pour ne pas
  // multiplier le total ni afficher le match en double.
  const byMatch = new Map<string, RawLog>()
  for (const l of logs as unknown as RawLog[]) {
    if (l.matches && !byMatch.has(l.match_id)) byMatch.set(l.match_id, l)
  }

  const deduped = Array.from(byMatch.values()).sort((a, b) =>
    (a.matches?.date ?? '').localeCompare(b.matches?.date ?? '')
  )

  let cumulative = 0
  const history: PlayerMatchEntry[] = deduped.map((l) => {
    cumulative += l.total_points
    const s = statsByMatch.get(l.match_id)
    return {
      match_id: l.match_id,
      match_date: l.matches!.date,
      home_team: l.matches!.home_team,
      away_team: l.matches!.away_team,
      home_score: l.matches!.home_score,
      away_score: l.matches!.away_score,
      stage: l.matches!.stage,
      status: l.matches!.status,
      played: s?.played ?? false,
      result: s?.result ?? null,
      goals: s?.goals ?? 0,
      assists: s?.assists ?? 0,
      motm: s?.motm ?? false,
      total_points: l.total_points,
      breakdown: l.points_breakdown as PointsBreakdown,
      cumulative_points: cumulative,
    }
  })

  return { player: playerRow as unknown as Player | null, history }
}

// ── getLiveMatches ────────────────────────────────────────────────────────────

/** Matchs actuellement en cours (status='live'), peu importe leur date de coup d'envoi. */
export async function getLiveMatches(): Promise<Match[]> {
  const supabase = getClient()
  const { data } = await supabase
    .from('matches')
    .select('id, api_match_id, home_team, away_team, home_score, away_score, date, venue, stage, status, last_verified_at, sync_attempts')
    .eq('status', 'live')
    .order('date', { ascending: true })
  return (data ?? []) as unknown as Match[]
}

// ── getUpcomingMatches ────────────────────────────────────────────────────────

export async function getUpcomingMatches(limit = 5): Promise<Match[]> {
  const supabase = getClient()
  const now = new Date().toISOString()
  // Uniquement les matchs à venir, non démarrés (les live ont leur propre bloc)
  const { data } = await supabase
    .from('matches')
    .select('id, api_match_id, home_team, away_team, home_score, away_score, date, venue, stage, status, last_verified_at, sync_attempts')
    .gte('date', now)
    .eq('status', 'scheduled')
    .order('date', { ascending: true })
    .limit(limit)
  return (data ?? []) as unknown as Match[]
}

// ── getAllMatches ─────────────────────────────────────────────────────────────

export async function getAllMatches(): Promise<Match[]> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('matches')
    .select('id, api_match_id, home_team, away_team, home_score, away_score, date, venue, stage, status, last_verified_at, sync_attempts')
    .order('date', { ascending: true })
  if (error) console.error('[getAllMatches]', error.message)
  return (data ?? []) as unknown as Match[]
}

// ── getAllParticipantsWithTeams ───────────────────────────────────────────────

export interface SlotEntry {
  slot: number
  player: {
    id: string
    name: string
    nationality: string
    nationality_code: string
    position: string
    photo_url: string | null
  } | null
  points: number
}

export interface ParticipantOverview {
  id: string
  name: string
  total_points: number
  rank: number
  slots: SlotEntry[]
}

export async function getAllParticipantsWithTeams(): Promise<ParticipantOverview[]> {
  const supabase = getClient()

  const [{ data: participantRows }, { data: teamRows }, pointsLogs] = await Promise.all([
    supabase
      .from('participants')
      .select('id, name, total_points')
      .order('total_points', { ascending: false }),
    supabase
      .from('teams')
      .select('participant_id, slot, players(id, name, nationality, nationality_code, position, photo_url)'),
    // points_log dépasse 1000 lignes au fil du tournoi → pagination
    fetchAll<{ player_id: string; total_points: number }>(supabase, 'points_log', 'player_id, total_points'),
  ])

  // Cumul des points par joueur (toutes équipes confondues — même joueur = mêmes points)
  const playerPoints = new Map<string, number>()
  for (const log of pointsLogs ?? []) {
    const pid = log.player_id as string
    playerPoints.set(pid, (playerPoints.get(pid) ?? 0) + ((log.total_points as number) || 0))
  }

  // Regroupement par participant
  type RawTeamRow = {
    participant_id: string
    slot: number
    players: { id: string; name: string; nationality: string; nationality_code: string; position: string; photo_url: string | null } | null
  }
  const teamsByParticipant = new Map<string, RawTeamRow[]>()
  for (const row of (teamRows ?? []) as unknown as RawTeamRow[]) {
    if (!teamsByParticipant.has(row.participant_id)) teamsByParticipant.set(row.participant_id, [])
    teamsByParticipant.get(row.participant_id)!.push(row)
  }

  return (participantRows ?? []).map((p, i) => ({
    id: p.id as string,
    name: p.name as string,
    total_points: (p.total_points as number) || 0,
    rank: i + 1,
    slots: (teamsByParticipant.get(p.id as string) ?? [])
      .sort((a, b) => a.slot - b.slot)
      .map((row) => ({
        slot: row.slot,
        player: row.players,
        points: row.players ? (playerPoints.get(row.players.id) ?? 0) : 0,
      })),
  }))
}

// ── getGlobalStats ────────────────────────────────────────────────────────────

export async function getGlobalStats(): Promise<GlobalStats> {
  const supabase = getClient()

  // player_stats, players (>1200) et points_log dépassent le plafond 1000 →
  // pagination obligatoire pour des stats globales exactes.
  const [participants, allStats, allPlayers, allLogs] = await Promise.all([
    supabase.from('participants').select('id, name, total_points').then((r) => r.data ?? []),
    fetchAll<{ player_id: string; goals: number; assists: number; played: boolean }>(
      supabase, 'player_stats', 'player_id, goals, assists, played'
    ),
    fetchAll<Pick<Player, 'id' | 'name' | 'nationality' | 'nationality_code' | 'position'>>(
      supabase, 'players', 'id, name, nationality, nationality_code, position'
    ),
    fetchAll<{ participant_id: string; player_id: string; total_points: number }>(
      supabase, 'points_log', 'participant_id, player_id, total_points'
    ),
  ])

  const totalParticipants = (participants ?? []).length
  const totalPrize = totalParticipants * 20

  // Index joueurs
  const playerMap = new Map<string, Pick<Player, 'id' | 'name' | 'nationality' | 'nationality_code' | 'position'>>()
  for (const p of allPlayers ?? []) {
    playerMap.set(p.id as string, p as unknown as Pick<Player, 'id' | 'name' | 'nationality' | 'nationality_code' | 'position'>)
  }

  // Agrégation goals / assists par joueur
  const goalsByPlayer = new Map<string, number>()
  const assistsByPlayer = new Map<string, number>()
  const matchesByPlayer = new Map<string, number>()

  for (const s of allStats ?? []) {
    const pid = s.player_id as string
    goalsByPlayer.set(pid, (goalsByPlayer.get(pid) ?? 0) + ((s.goals as number) || 0))
    assistsByPlayer.set(pid, (assistsByPlayer.get(pid) ?? 0) + ((s.assists as number) || 0))
    if (s.played) matchesByPlayer.set(pid, (matchesByPlayer.get(pid) ?? 0) + 1)
  }

  // Top 5 buteurs
  const topScorers: PlayerStats5[] = Array.from(goalsByPlayer.entries())
    .filter(([, g]) => g > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ player: playerMap.get(id)!, count }))
    .filter((x) => x.player)

  // Top 5 passeurs
  const topAssists: PlayerStats5[] = Array.from(assistsByPlayer.entries())
    .filter(([, a]) => a > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ player: playerMap.get(id)!, count }))
    .filter((x) => x.player)

  // Joueur le plus rentable (avg pts/match)
  const pointsByPlayer = new Map<string, number>()
  for (const l of allLogs ?? []) {
    const pid = l.player_id as string
    pointsByPlayer.set(pid, (pointsByPlayer.get(pid) ?? 0) + ((l.total_points as number) || 0))
  }

  const mostRentable = Array.from(pointsByPlayer.entries())
    .map(([id, total]) => {
      const mc = matchesByPlayer.get(id) ?? 0
      return { id, avg: mc > 0 ? total / mc : 0, matchCount: mc }
    })
    .filter((x) => x.matchCount >= 1)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5)
    .map((x) => ({ player: playerMap.get(x.id)!, avg: Math.round(x.avg * 10) / 10, matchCount: x.matchCount }))
    .filter((x) => x.player)

  // Participant le plus régulier (le plus de matchs avec au moins 1 joueur qui a joué)
  const matchCountByParticipant = new Map<string, Set<string>>()
  for (const l of allLogs ?? []) {
    const pid = l.participant_id as string
    const mid = l.player_id as string  // using player_id as proxy for "has a log entry"
    if (!matchCountByParticipant.has(pid)) matchCountByParticipant.set(pid, new Set())
    matchCountByParticipant.get(pid)!.add(mid)
  }

  let mostRegular: GlobalStats['mostRegular'] = null
  let maxActivity = 0
  for (const [pid, entries] of Array.from(matchCountByParticipant.entries())) {
    if (entries.size > maxActivity) {
      maxActivity = entries.size
      const p = (participants ?? []).find((x) => x.id === pid)
      if (p) {
        mostRegular = {
          participant: p as unknown as Pick<Participant, 'id' | 'name' | 'total_points'>,
          matchCount: entries.size,
        }
      }
    }
  }

  return {
    totalParticipants,
    totalPrize,
    prizeFirst: totalPrize,
    prizeSecond: 0,
    prizeThird: 0,
    topScorers,
    topAssists,
    mostRentable,
    mostRegular,
  }
}

// ── getMatchDetail ────────────────────────────────────────────────────────────

/** Un événement de match dérivé de player_stats (l'API ne sync pas la minute). */
export interface MatchEvent {
  type: 'goal' | 'freekick' | 'penalty' | 'assist' | 'yellow' | 'red' | 'penalty_saved'
  side: 'home' | 'away'
  playerId: string
  playerName: string
  position: Position
  count: number
}

/** Un joueur (de notre pool CdM) ayant figuré dans la feuille de match. */
export interface MatchLineupPlayer {
  id: string
  name: string
  nationality: string
  position: Position
  photo_url: string | null
  played: boolean
  goals: number
  assists: number
  motm: boolean
  red: boolean
  points: number
}

/** Points fantasy générés par un joueur sur ce match (calcul live depuis player_stats). */
export interface MatchFantasyEntry {
  player: Pick<Player, 'id' | 'name' | 'nationality' | 'nationality_code' | 'position'>
  side: 'home' | 'away'
  points: number
  breakdown: PointsBreakdown
  selectedBy: string[] // noms des participants ayant ce joueur (peut être vide)
}

/** Delta de points d'un participant grâce à ses joueurs sur ce match. */
export interface MatchRankingImpact {
  participantId: string
  participantName: string
  delta: number
}

export interface MatchDetail {
  match: Match
  prevId: string | null
  nextId: string | null
  hasStats: boolean
  home: { team: string; lineup: MatchLineupPlayer[] }
  away: { team: string; lineup: MatchLineupPlayer[] }
  events: MatchEvent[]
  fantasy: MatchFantasyEntry[]
  rankingImpact: MatchRankingImpact[]
}

const EVENT_ORDER: Record<MatchEvent['type'], number> = {
  goal: 0, freekick: 1, penalty: 2, penalty_saved: 3, red: 4, yellow: 5, assist: 6,
}

export async function getMatchDetail(matchId: string): Promise<MatchDetail | null> {
  const supabase = getClient()

  const matchCols =
    'id, api_match_id, home_team, away_team, home_score, away_score, date, venue, stage, status, last_verified_at, sync_attempts'

  const [{ data: matchRow }, { data: allMatches }] = await Promise.all([
    supabase.from('matches').select(matchCols).eq('id', matchId).single(),
    supabase.from('matches').select('id, date').order('date', { ascending: true }),
  ])

  if (!matchRow) return null
  const match = matchRow as unknown as Match

  // Navigation prev/next dans l'ordre chronologique
  const ordered = (allMatches ?? []) as Array<{ id: string; date: string }>
  const idx = ordered.findIndex((m) => m.id === matchId)
  const prevId = idx > 0 ? ordered[idx - 1].id : null
  const nextId = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1].id : null

  // player_stats du match + joueurs (notre pool CdM uniquement)
  const { data: statRows } = await supabase
    .from('player_stats')
    .select(
      'player_id, played, result, goals, assists, motm, yellow_cards, red_cards, penalty_saved, penalty_scored, freekick_goal, cleansheet, ' +
        'players(id, name, nationality, nationality_code, position, photo_url)'
    )
    .eq('match_id', matchId)

  type RawStat = {
    player_id: string
    played: boolean
    result: string | null
    goals: number
    assists: number
    motm: boolean
    yellow_cards: number
    red_cards: number
    penalty_saved: number
    penalty_scored: number
    freekick_goal: number
    cleansheet: boolean
    players: {
      id: string
      name: string
      nationality: string
      nationality_code: string
      position: Position
      photo_url: string | null
    } | null
  }

  const stats = (statRows ?? []) as unknown as RawStat[]
  const hasStats = stats.length > 0

  const sideOf = (nationality: string): 'home' | 'away' | null => {
    if (nationality === match.home_team) return 'home'
    if (nationality === match.away_team) return 'away'
    return null
  }

  const home: MatchLineupPlayer[] = []
  const away: MatchLineupPlayer[] = []
  const events: MatchEvent[] = []
  const fantasy: MatchFantasyEntry[] = []

  // Quels joueurs sont sélectionnés par quels participants (pour l'impact + "selectedBy")
  const playerIds = stats.map((s) => s.player_id)
  const { data: teamRows } = playerIds.length
    ? await supabase
        .from('teams')
        .select('player_id, participant_id, participants(name)')
        .in('player_id', playerIds)
    : { data: [] as unknown[] }

  type RawTeam = { player_id: string; participant_id: string; participants: { name: string } | null }
  const selectedByPlayer = new Map<string, { participantId: string; name: string }[]>()
  for (const t of (teamRows ?? []) as unknown as RawTeam[]) {
    if (!selectedByPlayer.has(t.player_id)) selectedByPlayer.set(t.player_id, [])
    selectedByPlayer.get(t.player_id)!.push({ participantId: t.participant_id, name: t.participants?.name ?? '—' })
  }

  const impact = new Map<string, MatchRankingImpact>()

  for (const s of stats) {
    const p = s.players
    if (!p) continue
    const side = sideOf(p.nationality)
    if (!side) continue

    const scoring = calculatePlayerPoints(
      {
        id: '', player_id: p.id, match_id: matchId,
        played: s.played,
        result: (s.result as 'win' | 'draw' | 'loss' | null) ?? null,
        goals: s.goals, assists: s.assists, motm: s.motm,
        yellow_cards: s.yellow_cards, red_cards: s.red_cards,
        penalty_saved: s.penalty_saved, penalty_scored: s.penalty_scored,
        freekick_goal: s.freekick_goal, cleansheet: s.cleansheet,
      },
      p.position
    )

    const lineupEntry: MatchLineupPlayer = {
      id: p.id, name: p.name, nationality: p.nationality, position: p.position,
      photo_url: p.photo_url, played: s.played,
      goals: s.goals, assists: s.assists, motm: s.motm, red: s.red_cards > 0,
      points: scoring.total,
    }
    ;(side === 'home' ? home : away).push(lineupEntry)

    // Événements dérivés (uniquement si le joueur a effectivement joué)
    if (s.played) {
      const normalGoals = s.goals - s.freekick_goal - s.penalty_scored
      if (normalGoals > 0) events.push({ type: 'goal', side, playerId: p.id, playerName: p.name, position: p.position, count: normalGoals })
      if (s.freekick_goal > 0) events.push({ type: 'freekick', side, playerId: p.id, playerName: p.name, position: p.position, count: s.freekick_goal })
      if (s.penalty_scored > 0) events.push({ type: 'penalty', side, playerId: p.id, playerName: p.name, position: p.position, count: s.penalty_scored })
      if (s.assists > 0) events.push({ type: 'assist', side, playerId: p.id, playerName: p.name, position: p.position, count: s.assists })
      if (s.red_cards > 0) events.push({ type: 'red', side, playerId: p.id, playerName: p.name, position: p.position, count: s.red_cards })
      if (s.yellow_cards > 0) events.push({ type: 'yellow', side, playerId: p.id, playerName: p.name, position: p.position, count: s.yellow_cards })
      if (s.penalty_saved > 0) events.push({ type: 'penalty_saved', side, playerId: p.id, playerName: p.name, position: p.position, count: s.penalty_saved })
    }

    // Section fantasy : tout joueur du pool qui a marqué/perdu des points
    if (scoring.total !== 0) {
      const selectors = selectedByPlayer.get(p.id) ?? []
      fantasy.push({
        player: { id: p.id, name: p.name, nationality: p.nationality, nationality_code: p.nationality_code, position: p.position },
        side,
        points: scoring.total,
        breakdown: scoring,
        selectedBy: selectors.map((x) => x.name),
      })

      // Impact classement : seuls les joueurs réellement sélectionnés comptent
      for (const sel of selectors) {
        const cur = impact.get(sel.participantId) ?? { participantId: sel.participantId, participantName: sel.name, delta: 0 }
        cur.delta += scoring.total
        impact.set(sel.participantId, cur)
      }
    }
  }

  // Tri : titulaires/joueurs d'abord (played), puis par points décroissants
  const byImpact = (a: MatchLineupPlayer, b: MatchLineupPlayer) =>
    Number(b.played) - Number(a.played) || b.points - a.points || a.name.localeCompare(b.name)
  home.sort(byImpact)
  away.sort(byImpact)

  events.sort((a, b) => EVENT_ORDER[a.type] - EVENT_ORDER[b.type] || a.playerName.localeCompare(b.playerName))
  fantasy.sort((a, b) => b.points - a.points || a.player.name.localeCompare(b.player.name))

  const rankingImpact = Array.from(impact.values()).sort((a, b) => b.delta - a.delta)

  return { match, prevId, nextId, hasStats, home: { team: match.home_team, lineup: home }, away: { team: match.away_team, lineup: away }, events, fantasy, rankingImpact }
}
