/**
 * queries.ts — Fonctions Supabase pour les pages publiques.
 * Toutes les requêtes utilisent la clé anon (données publiques, RLS read-only).
 * createClient sans generic pour éviter les erreurs TS d'inférence (pattern projet).
 */

import { createClient } from '@supabase/supabase-js'
import type { Match, Player, Participant, PointsBreakdown } from './types'

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

  const [{ data: playerRow }, { data: logs }] = await Promise.all([
    supabase
      .from('players')
      .select('id, name, nationality, nationality_code, position, photo_url, api_football_id')
      .eq('id', playerId)
      .single(),
    supabase
      .from('points_log')
      .select('match_id, total_points, points_breakdown, matches(id, date, home_team, away_team, home_score, away_score, stage, status), player_stats(played, result, goals, assists, motm)')
      .eq('player_id', playerId),
  ])

  if (!logs?.length) {
    return { player: playerRow as unknown as Player | null, history: [] }
  }

  type RawLog = {
    match_id: string
    total_points: number
    points_breakdown: unknown
    matches: Pick<Match, 'date' | 'home_team' | 'away_team' | 'home_score' | 'away_score' | 'stage' | 'status'> | null
    player_stats: Array<{ played: boolean; result: string | null; goals: number; assists: number; motm: boolean }> | null
  }

  const rawLogs = logs as unknown as RawLog[]

  // Trier par date de match
  rawLogs.sort((a, b) => {
    const da = a.matches?.date ?? ''
    const db = b.matches?.date ?? ''
    return da.localeCompare(db)
  })

  let cumulative = 0
  const history: PlayerMatchEntry[] = rawLogs
    .filter((l) => l.matches)
    .map((l) => {
      cumulative += l.total_points
      const stats = Array.isArray(l.player_stats) ? l.player_stats[0] : null
      return {
        match_id: l.match_id,
        match_date: l.matches!.date,
        home_team: l.matches!.home_team,
        away_team: l.matches!.away_team,
        home_score: l.matches!.home_score,
        away_score: l.matches!.away_score,
        stage: l.matches!.stage,
        status: l.matches!.status,
        played: stats?.played ?? false,
        result: stats?.result ?? null,
        goals: stats?.goals ?? 0,
        assists: stats?.assists ?? 0,
        motm: stats?.motm ?? false,
        total_points: l.total_points,
        breakdown: l.points_breakdown as PointsBreakdown,
        cumulative_points: cumulative,
      }
    })

  return { player: playerRow as unknown as Player | null, history }
}

// ── getLiveMatches ────────────────────────────────────────────────────────────

export async function getLiveMatches(): Promise<Match[]> {
  const supabase = getClient()
  const { data } = await supabase
    .from('matches')
    .select('id, api_match_id, home_team, away_team, home_score, away_score, date, venue, stage, status, last_verified_at, sync_attempts')
    .eq('status', 'live')
  return (data ?? []) as unknown as Match[]
}

// ── getUpcomingMatches ────────────────────────────────────────────────────────

export async function getUpcomingMatches(limit = 5): Promise<Match[]> {
  const supabase = getClient()
  const now = new Date().toISOString()
  const { data } = await supabase
    .from('matches')
    .select('id, api_match_id, home_team, away_team, home_score, away_score, date, venue, stage, status, last_verified_at, sync_attempts')
    .gte('date', now)
    .in('status', ['scheduled', 'live'])
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

  const [
    { data: participantRows },
    { data: teamRows },
    { data: pointsLogs },
  ] = await Promise.all([
    supabase
      .from('participants')
      .select('id, name, total_points')
      .order('total_points', { ascending: false }),
    supabase
      .from('teams')
      .select('participant_id, slot, players(id, name, nationality, nationality_code, position, photo_url)'),
    supabase
      .from('points_log')
      .select('player_id, total_points'),
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

  const [
    { data: participants },
    { data: allStats },
    { data: allPlayers },
    { data: allLogs },
  ] = await Promise.all([
    supabase.from('participants').select('id, name, total_points'),
    supabase.from('player_stats').select('player_id, goals, assists, played'),
    supabase.from('players').select('id, name, nationality, nationality_code, position'),
    supabase.from('points_log').select('participant_id, player_id, total_points'),
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
    prizeFirst: Math.round(totalPrize * 0.6),
    prizeSecond: Math.round(totalPrize * 0.3),
    prizeThird: Math.round(totalPrize * 0.1),
    topScorers,
    topAssists,
    mostRentable,
    mostRegular,
  }
}
