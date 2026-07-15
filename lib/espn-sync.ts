/**
 * espn-sync.ts — Renseigne un match de phase finale depuis ESPN quand
 * l'API-Football est hors d'atteinte (plan gratuit sans accès saison 2026).
 *
 * Complète [[fifa-fallback]], qui ne sait donner que score + homme du match :
 * ESPN fournit la feuille complète, donc buteurs, passeurs, cartons, penalties
 * et cleansheets. Le barème est appliqué par le même calculatePlayerPoints que
 * le chemin API-Football — aucune règle n'est réimplémentée ici.
 *
 * Appariement des joueurs : ESPN ne connaît pas nos api_football_id, seulement
 * des noms. On restreint donc les candidats à la nationalité de l'équipe (via
 * getCountryCode) puis on réutilise bestNameMatch, déjà éprouvé sur le MOTM
 * officiel FIFA (accents, prénoms abrégés, noms composés). Un joueur non apparié
 * est signalé, jamais deviné.
 *
 * Périmètre volontairement étroit : uniquement les matchs dont l'api_match_id est
 * encore un placeholder du seed, c'est-à-dire ceux que l'API n'a jamais pu
 * servir. Un match résolu par l'API n'est jamais touché — les données ESPN ne
 * peuvent donc pas écraser des données API.
 *
 * Réversible : si l'abonnement payant revient, le resolver remappe ces lignes et
 * le sync API réécrit les player_stats par-dessus.
 */

import type { createServiceClient } from './supabase-clients'
import { calculatePlayerPoints } from './scoring'
import { bestNameMatch } from './fifa-motm'
import { getCountryCode } from './flags'
import { isPlaceholderApiId, KNOCKOUT_STAGES } from './knockout-resolver'
import { applyAbsentTeamResultBonus } from './team-result-bonus'
import { findEspnEventId, fetchEspnMatch, type EspnPlayerStat } from './espn'
import type { Position, PlayerStats, PointsBreakdown } from './types'

type SB = ReturnType<typeof createServiceClient>

export interface EspnSyncResult {
  matchesUpdated: number
  playersUpdated: number
  unmatched: string[] // joueurs ESPN ayant un point à marquer mais non appariés
  notFound: number // match sans event ESPN (pas encore joué / introuvable)
  participantsRecalculated: number
  errors: string[]
}

export interface EspnSyncOptions {
  apply?: boolean
  onLog?: (msg: string) => void
}

function toBreakdown(r: ReturnType<typeof calculatePlayerPoints>): PointsBreakdown {
  return {
    win_bonus: r.win_bonus,
    draw_bonus: r.draw_bonus,
    goal_position_bonus: r.goal_position_bonus,
    goal_freekick_bonus: r.goal_freekick_bonus,
    goal_penalty_bonus: r.goal_penalty_bonus,
    assist_bonus: r.assist_bonus,
    motm_bonus: r.motm_bonus,
    cleansheet_bonus: r.cleansheet_bonus,
    penalty_saved_bonus: r.penalty_saved_bonus,
    red_card_malus: r.red_card_malus,
  }
}

function sideResult(my: number, opp: number): 'win' | 'draw' | 'loss' {
  return my > opp ? 'win' : my === opp ? 'draw' : 'loss'
}

/** Un joueur ESPN a-t-il quoi que ce soit qui rapporte (ou coûte) des points ? */
function isScoringRelevant(p: EspnPlayerStat): boolean {
  return (
    p.goals > 0 || p.assists > 0 || p.redCards > 0 || p.penaltySaved > 0 || p.cleansheet
  )
}

export async function syncKnockoutFromEspn(
  supabase: SB,
  options: EspnSyncOptions = {},
): Promise<EspnSyncResult> {
  const apply = options.apply ?? true
  const log = options.onLog ?? (() => {})
  const result: EspnSyncResult = {
    matchesUpdated: 0,
    playersUpdated: 0,
    unmatched: [],
    notFound: 0,
    participantsRecalculated: 0,
    errors: [],
  }

  // 1. Matchs de phase finale que l'API n'a jamais résolus.
  const { data: rows, error: rowsErr } = await supabase
    .from('matches')
    .select('id, api_match_id, home_team, away_team, date, stage, status')
    .in('stage', KNOCKOUT_STAGES as unknown as string[])
    .order('date', { ascending: true })
  if (rowsErr) {
    result.errors.push(`matches: ${rowsErr.message}`)
    return result
  }

  const candidates = (rows ?? []).filter((r) =>
    isPlaceholderApiId(r.api_match_id as number | null),
  )
  if (candidates.length === 0) return result

  // Un match ayant déjà une ligne played=true tient ses stats d'une vraie
  // feuille (ESPN ou API) → inutile d'y revenir. Le fallback FIFA, lui, ne crée
  // que des lignes played=false : ces matchs-là restent à compléter.
  const pending: typeof candidates = []
  for (const m of candidates) {
    const { count, error } = await supabase
      .from('player_stats')
      .select('*', { count: 'exact', head: true })
      .eq('match_id', m.id as string)
      .eq('played', true)
    if (error) {
      result.errors.push(`player_stats count ${m.id}: ${error.message}`)
      continue
    }
    if ((count ?? 0) === 0) pending.push(m)
  }
  if (pending.length === 0) return result

  // 2. Pool complet (paginé : PostgREST plafonne à 1000 lignes).
  const PAGE = 1000
  const pool: Array<{ id: string; name: string; nationality: string; position: Position }> = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, nationality, position')
      .range(from, from + PAGE - 1)
    if (error) {
      result.errors.push(`players page ${from}: ${error.message}`)
      break
    }
    if (!data || data.length === 0) break
    pool.push(...(data as unknown as typeof pool))
    if (data.length < PAGE) break
  }

  const affectedParticipants = new Set<string>()

  for (const m of pending) {
    const homeTeam = m.home_team as string
    const awayTeam = m.away_team as string

    // Le fallback FIFA a normalement déjà posé les vraies équipes ; sans elles
    // (encore "TBD"), impossible d'identifier l'event ESPN.
    let eventId: string | null = null
    try {
      eventId = await findEspnEventId(m.date as string, homeTeam, awayTeam)
    } catch (err) {
      result.errors.push(`findEspnEventId ${m.id}: ${err instanceof Error ? err.message : String(err)}`)
      continue
    }
    if (!eventId) {
      result.notFound++
      continue
    }

    let espn
    try {
      espn = await fetchEspnMatch(eventId)
    } catch (err) {
      result.errors.push(`fetchEspnMatch ${eventId}: ${err instanceof Error ? err.message : String(err)}`)
      continue
    }
    if (!espn.finished) {
      result.notFound++
      continue
    }

    // ESPN peut inverser domicile/extérieur par rapport à notre ligne : on
    // s'aligne sur les codes pays plutôt que sur l'ordre.
    const homeCode = getCountryCode(homeTeam)
    const espnHomeCode = getCountryCode(espn.homeTeam)
    const flipped = homeCode !== null && espnHomeCode !== null && homeCode !== espnHomeCode
    const hs = flipped ? espn.awayScore : espn.homeScore
    const as = flipped ? espn.homeScore : espn.awayScore

    log(`  ⚽ ${homeTeam} ${hs}-${as} ${awayTeam} (ESPN ${eventId}, ${espn.players.length} joueurs)`)

    const resultByCode = new Map<string, 'win' | 'draw' | 'loss'>()
    if (homeCode) resultByCode.set(homeCode, sideResult(hs, as))
    const awayCode = getCountryCode(awayTeam)
    if (awayCode) resultByCode.set(awayCode, sideResult(as, hs))

    if (apply) {
      const { error: upErr } = await supabase
        .from('matches')
        .update({
          home_score: hs,
          away_score: as,
          status: 'finished',
          status_short: 'FT',
          last_verified_at: new Date().toISOString(),
        })
        .eq('id', m.id as string)
      if (upErr) {
        result.errors.push(`update match ${m.id}: ${upErr.message}`)
        continue
      }
    }

    let touched = 0
    for (const p of espn.players) {
      const teamCode = getCountryCode(p.team)
      if (!teamCode) continue
      const sideRes = resultByCode.get(teamCode)
      if (!sideRes) continue

      const cands = pool
        .filter((x) => getCountryCode(x.nationality) === teamCode)
        .map((x) => ({ id: x.id, name: x.name }))
      const playerId = bestNameMatch(p.name, cands)
      if (!playerId) {
        // Seuls les joueurs porteurs de points méritent d'être signalés : un
        // remplaçant non entré et non apparié n'a aucune incidence.
        if (isScoringRelevant(p)) result.unmatched.push(`${p.name} (${p.team})`)
        continue
      }

      const position = pool.find((x) => x.id === playerId)?.position
      if (!position) continue

      const stats: PlayerStats = {
        id: '',
        player_id: playerId,
        match_id: m.id as string,
        played: p.played,
        result: sideRes,
        goals: p.goals,
        assists: p.assists,
        motm: false, // posé ensuite par reconcileOfficialMotm (source FIFA)
        yellow_cards: p.yellowCards,
        red_cards: p.redCards,
        penalty_saved: p.penaltySaved,
        penalty_scored: p.penaltyScored,
        freekick_goal: p.freekickGoal,
        cleansheet: p.cleansheet,
        minutes: null,
      }

      if (!apply) {
        if (isScoringRelevant(p)) {
          const s = calculatePlayerPoints(stats, position)
          log(`     ${p.name} → ${s.total} pts (buts:${p.goals} passes:${p.assists}${p.cleansheet ? ' CS' : ''}${p.redCards ? ' RC' : ''})`)
        }
        touched++
        continue
      }

      const { error: psErr } = await supabase.from('player_stats').upsert(
        {
          player_id: playerId,
          match_id: m.id as string,
          played: p.played,
          result: sideRes,
          goals: p.goals,
          assists: p.assists,
          motm: false,
          motm_proxy: false,
          motm_official: false,
          yellow_cards: p.yellowCards,
          red_cards: p.redCards,
          penalty_saved: p.penaltySaved,
          penalty_scored: p.penaltyScored,
          freekick_goal: p.freekickGoal,
          cleansheet: p.cleansheet,
          minutes: null,
        },
        { onConflict: 'player_id,match_id' },
      )
      if (psErr) {
        result.errors.push(`player_stats ${playerId}: ${psErr.message}`)
        continue
      }

      const scoring = calculatePlayerPoints(stats, position)
      const breakdown = toBreakdown(scoring)

      const { data: teamEntries } = await supabase
        .from('teams')
        .select('participant_id')
        .eq('player_id', playerId)

      for (const { participant_id } of teamEntries ?? []) {
        const pid = participant_id as string
        const { error: logErr } = await supabase.from('points_log').upsert(
          {
            participant_id: pid,
            player_id: playerId,
            match_id: m.id as string,
            points_breakdown: breakdown,
            total_points: scoring.total,
          },
          { onConflict: 'participant_id,player_id,match_id' },
        )
        if (logErr) result.errors.push(`points_log p=${pid}: ${logErr.message}`)
        else affectedParticipants.add(pid)
      }
      touched++
    }

    result.playersUpdated += touched
    result.matchesUpdated++

    // Sélectionnés des deux nations absents de la feuille ESPN → bonus de
    // résultat seul (blessés, non convoqués).
    if (apply) {
      try {
        const absent = await applyAbsentTeamResultBonus(supabase, m.id as string)
        for (const pid of Array.from(absent)) affectedParticipants.add(pid)
      } catch (err) {
        result.errors.push(`bonus absents ${m.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  if (apply) {
    for (const pid of Array.from(affectedParticipants)) {
      const { data: logs } = await supabase
        .from('points_log')
        .select('total_points')
        .eq('participant_id', pid)
      const total = (logs ?? []).reduce((s, r) => s + ((r.total_points as number) || 0), 0)
      await supabase.from('participants').update({ total_points: total }).eq('id', pid)
    }
  }
  result.participantsRecalculated = affectedParticipants.size

  return result
}
