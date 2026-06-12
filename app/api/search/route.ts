import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculatePlayerPoints } from '@/lib/scoring'
import { getNationsIndex } from '@/lib/queries'
import { TEAM_NAME_FR, getCountryCode } from '@/lib/flags'
import type { Position, MatchResult } from '@/lib/types'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// Endpoint public non authentifié → clé ANON uniquement (jamais le service_role).
// La lecture est protégée par les policies RLS SELECT publiques.
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/** Échappe les wildcards LIKE (% _ \) pour éviter l'injection de pattern. */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, '\\$&')
}

/** Minuscule + sans accents, pour comparer pseudos / noms FR saisis au clavier. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

export async function GET(request: Request) {
  // Garde-fou anti-burst / quota : 30 requêtes / min par IP.
  const ip = clientIp(request.headers)
  if (!rateLimit(`search:${ip}`, 30, 60 * 1000)) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  // Cap de longueur (évite les patterns LIKE coûteux) puis échappement wildcards.
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 50)
  if (q.length < 2) {
    return NextResponse.json({ participants: [], teams: [], players: [], matches: [] })
  }
  const nq = norm(q)
  const likeQ = escapeLike(q)
  const supabase = getClient()

  const [
    { data: participantRows },
    { data: playerRows },
    nations,
    { data: matchRows },
  ] = await Promise.all([
    supabase.from('participants').select('id, name, total_points').order('total_points', { ascending: false }),
    supabase
      .from('players')
      .select('id, name, nationality, position, photo_url')
      .ilike('name', `%${likeQ}%`)
      .limit(8),
    getNationsIndex(),
    supabase
      .from('matches')
      .select('id, home_team, away_team, home_score, away_score, date, status')
      .order('date', { ascending: true }),
  ])

  // ① PARTICIPANTS — rang calculé sur le classement complet, filtré par pseudo
  const participants = (participantRows ?? [])
    .map((p, i) => ({ id: p.id as string, name: p.name as string, points: (p.total_points as number) || 0, rank: i + 1 }))
    .filter((p) => norm(p.name).includes(nq))
    .slice(0, 6)

  // ② ÉQUIPES WC — recherche sur nom FR ou anglais
  const matchedNations = nations.filter((n) => norm(n.nameFr).includes(nq) || norm(n.name).includes(nq))
  const teams = matchedNations.slice(0, 6).map((n) => ({ code: n.code, name: n.nameFr, group: n.group }))

  // ③ JOUEURS — par nom OU par nation matchée ("Mexique" → joueurs mexicains)
  type RawPlayer = { id: string; name: string; nationality: string; position: Position; photo_url: string | null }
  const byName = (playerRows ?? []) as unknown as RawPlayer[]
  let byNation: RawPlayer[] = []
  if (matchedNations.length > 0) {
    const { data } = await supabase
      .from('players')
      .select('id, name, nationality, position, photo_url')
      .in('nationality', matchedNations.map((n) => n.name))
      .limit(8)
    byNation = (data ?? []) as unknown as RawPlayer[]
  }
  // Fusion (noms d'abord), dédup par id, max 8
  const seen = new Set<string>()
  const players0: RawPlayer[] = []
  for (const p of [...byName, ...byNation]) {
    if (seen.has(p.id)) continue
    seen.add(p.id)
    players0.push(p)
    if (players0.length >= 8) break
  }
  const ids = players0.map((p) => p.id)
  const pointsById = new Map<string, number>()
  if (ids.length) {
    const { data: stats } = await supabase
      .from('player_stats')
      .select('player_id, played, result, goals, assists, motm, yellow_cards, red_cards, penalty_saved, penalty_scored, freekick_goal, cleansheet')
      .in('player_id', ids)
    const posById = new Map(players0.map((p) => [p.id, p.position]))
    for (const s of (stats ?? []) as Array<Record<string, unknown>>) {
      const pid = s.player_id as string
      const pos = posById.get(pid)
      if (!pos) continue
      const scoring = calculatePlayerPoints(
        {
          id: '', player_id: pid, match_id: '', played: s.played as boolean,
          result: (s.result as MatchResult | null) ?? null,
          goals: (s.goals as number) || 0, assists: (s.assists as number) || 0, motm: s.motm as boolean,
          yellow_cards: (s.yellow_cards as number) || 0, red_cards: (s.red_cards as number) || 0,
          penalty_saved: (s.penalty_saved as number) || 0, penalty_scored: (s.penalty_scored as number) || 0,
          freekick_goal: (s.freekick_goal as number) || 0, cleansheet: s.cleansheet as boolean,
        },
        pos
      )
      pointsById.set(pid, (pointsById.get(pid) ?? 0) + scoring.total)
    }
  }
  const players = players0.map((p) => ({
    id: p.id,
    name: p.name,
    nationalityFr: TEAM_NAME_FR[p.nationality] ?? p.nationality,
    nationality: p.nationality,
    code: getCountryCode(p.nationality),
    position: p.position,
    photo_url: p.photo_url,
    points: pointsById.get(p.id) ?? 0,
  }))

  // ④ MATCHS — via les nations dont le nom matche la requête
  const matchedNames = new Set(matchedNations.map((n) => n.code))
  type RawMatch = { id: string; home_team: string; away_team: string; home_score: number | null; away_score: number | null; date: string; status: string }
  const all = (matchRows ?? []) as unknown as RawMatch[]
  const matched = all.filter(
    (m) => matchedNames.has(getCountryCode(m.home_team) ?? '') || matchedNames.has(getCountryCode(m.away_team) ?? '')
  )
  // Priorité : en cours → à venir (plus proches) → terminés (plus récents)
  const now = Date.now()
  const live = matched.filter((m) => m.status === 'live')
  const upcoming = matched.filter((m) => m.status === 'scheduled' && new Date(m.date + 'Z').getTime() >= now)
  const finished = matched.filter((m) => m.status === 'finished' || (m.status === 'scheduled' && new Date(m.date + 'Z').getTime() < now)).reverse()
  const matches = [...live, ...upcoming, ...finished].slice(0, 6).map((m) => ({
    id: m.id,
    home: m.home_team,
    away: m.away_team,
    homeFr: TEAM_NAME_FR[m.home_team] ?? m.home_team,
    awayFr: TEAM_NAME_FR[m.away_team] ?? m.away_team,
    home_score: m.home_score,
    away_score: m.away_score,
    date: m.date,
    status: m.status,
  }))

  return NextResponse.json({ participants, teams, players, matches })
}
