/**
 * Cron de synchronisation. Deux régimes cohabitent, pilotés par SYNC_MODE
 * (cf. lib/sync-mode.ts) :
 *
 *   'live'  — temps réel, ~2900 requêtes/jour. Exige un plan API-Football payant.
 *   'final' — résultat final uniquement, ~20 requêtes/jour. Défaut, tient dans
 *             le plan gratuit (100/jour).
 *
 * Le mode live sondait chaque match à la minute et appelait `/fixtures?live=all`
 * à chaque cycle. Sur plan gratuit le quota mourait en moins d'une heure, et un
 * match terminé pouvait être resynchronisé en boucle (1241 fois sur
 * Argentine-Suisse) car le chemin « live » court-circuitait le plafond de
 * tentatives.
 *
 * Contrat du mode 'final' : AUCUN appel API tant qu'aucun match n'est réellement
 * dû. Un match n'est synchronisé qu'une fois censé terminé (coup d'envoi +
 * 2h45), au plus MAX_SYNC_ATTEMPTS fois, espacées d'au moins une heure. Un match
 * déjà `finished` n'est plus re-sondé : le MOTM officiel publié tardivement est
 * rattrapé par la réconciliation FIFA, qui est gratuite.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as getSupabase } from '@/lib/supabase-clients'
import { syncMatch } from '@/lib/sync-engine'
import { fetchLiveFixtureIds } from '@/lib/api-football'
import { parseMatchDateUTC } from '@/lib/datetime'
import { generateDailyRecapIfNeeded } from '@/lib/recap'
import { reconcileOfficialMotm } from '@/lib/motm-reconcile'
import { getSyncMode } from '@/lib/sync-mode'
import { applyFifaFallback } from '@/lib/fifa-fallback'
import { syncKnockoutFromEspn } from '@/lib/espn-sync'
import {
  resolveKnockoutFixtures,
  needsKnockoutResolution,
  isPlaceholderApiId,
} from '@/lib/knockout-resolver'

// Fenêtre de réconciliation du MOTM officiel FIFA : on ne re-vérifie que les
// matchs des 5 derniers jours. FIFA publie son Player of the Match en quelques
// heures (rarement plus) ; au-delà, c'est déjà capté (idempotent) ou réglé via
// le script de backfill. Borne le coût par cycle à une poignée de matchs.
const MOTM_RECONCILE_WINDOW_MS = 5 * 24 * 60 * 60 * 1000

/**
 * Applique le MOTM officiel FIFA aux matchs terminés où il vient d'être publié
 * (best-effort). Tourne AVANT la chronique pour qu'elle reflète les points
 * corrigés. Idempotent : ne touche que les matchs sans MOTM officiel encore capté.
 */
async function tryReconcileMotm(supabase: ReturnType<typeof getSupabase>): Promise<number> {
  try {
    const r = await reconcileOfficialMotm(supabase, { windowMs: MOTM_RECONCILE_WINDOW_MS })
    return r.matchesUpdated
  } catch (err) {
    console.error('[cron] motm', err instanceof Error ? err.message : String(err))
    return 0
  }
}

/** Génère la chronique du jour si une journée vient de se terminer (best-effort). */
async function tryRecap(supabase: ReturnType<typeof getSupabase>): Promise<boolean> {
  try {
    return (await generateDailyRecapIfNeeded(supabase)).generated
  } catch (err) {
    console.error('[cron] recap', err instanceof Error ? err.message : String(err))
    return false
  }
}

// Fenêtre live (mode 'live') / délai au terme duquel un match est réputé terminé
// (mode 'final') : coup d'envoi + 2h45, prolongation et TAB comprises.
const FINAL_DELAY_MS = 165 * 60 * 1000
// Mode 'live' : rattrapage horaire jusqu'à 24h après le coup d'envoi.
const LIVE_CATCHUP_WINDOW_MS = 24 * 60 * 60 * 1000
// Mode 'live' : plafond de post-checks sur un match terminé.
const MAX_POST_CHECK_ATTEMPTS = 6
// Au-delà de 3 jours après le coup d'envoi, on n'insiste plus automatiquement
// (rattrapage manuel via script) — évite de brûler le quota sur un match dont
// la fixture est introuvable.
const CATCHUP_WINDOW_MS = 3 * 24 * 60 * 60 * 1000
// Délai minimal entre deux tentatives sur un même match.
const RETRY_INTERVAL_MS = 60 * 60 * 1000
// Plafond de tentatives par match (un match terminé est capté du 1er coup ;
// les suivantes couvrent une fixture publiée en retard).
const MAX_SYNC_ATTEMPTS = 4
// Le resolver de phase finale coûte 1 requête : ne le déclencher qu'à l'approche
// d'un match non résolu, et au plus une fois par heure.
const RESOLVER_LOOKAHEAD_MS = 6 * 60 * 60 * 1000
const RESOLVER_RETRY_MS = 60 * 60 * 1000

export async function GET(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = getSupabase()
  const now = new Date()
  const syncMode = getSyncMode()

  // ── Identifier les matchs à synchroniser ─────────────────────────────────

  const { data: matches, error: fetchErr } = await supabase
    .from('matches')
    .select('id, date, status, last_verified_at, sync_attempts, api_match_id, home_team, stage')
    .or('status.eq.scheduled,status.eq.live,status.eq.finished')

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  // ── Résoudre les matchs de phase finale encore en placeholder ─────────────
  // L'API ne crée la fixture réelle qu'une fois les deux équipes connues. Le
  // resolver coûte 1 requête : on ne le déclenche qu'à l'approche (ou après) le
  // coup d'envoi d'un slot non résolu, et au plus une fois par heure — sinon,
  // avec des slots « TBD » permanents (3e place, finale), il tournerait à chaque
  // cycle et viderait le quota à lui seul.
  let knockout = { remapped: 0, refreshed: 0, resynced: 0, errors: [] as string[] }
  const pendingKnockout = (matches ?? []).filter((m) =>
    needsKnockoutResolution({
      stage: m.stage as string | null,
      home_team: m.home_team as string,
      api_match_id: m.api_match_id as number | null,
    })
  )
  // En mode 'live' le quota est large : on résout dès qu'il reste un slot.
  const resolverDue =
    syncMode === 'live'
      ? pendingKnockout.length > 0
      : pendingKnockout.some((m) => {
          const kickoff = parseMatchDateUTC(m.date as string)
          const near = now.getTime() >= kickoff.getTime() - RESOLVER_LOOKAHEAD_MS
          const lastTry = m.last_verified_at ? new Date(m.last_verified_at as string).getTime() : 0
          return near && now.getTime() - lastTry >= RESOLVER_RETRY_MS
        })
  let fifaFallback = { matchesUpdated: 0, participantsRecalculated: 0, notPublished: 0, errors: [] as string[] }
  let espn = { matchesUpdated: 0, playersUpdated: 0, unmatched: [] as string[], notFound: 0, participantsRecalculated: 0, errors: [] as string[] }
  if (resolverDue) {
    // 1. L'API d'abord : elle seule fournit les stats complètes. Sans plan payant
    //    elle échoue (saison 2026 inaccessible) et ne remappe rien.
    knockout = await resolveKnockoutFixtures(supabase)

    // 2. Filet gratuit, en deux temps, sur les seules lignes encore en
    //    placeholder (donc jamais sur des données API) :
    //    a) FIFA donne les équipes et le score → identifie le match et crédite
    //       le bonus de résultat, même si ESPN ne le connaît pas encore.
    try {
      fifaFallback = await applyFifaFallback(supabase)
    } catch (err) {
      fifaFallback.errors.push(`fifaFallback: ${err instanceof Error ? err.message : String(err)}`)
    }
    //    b) ESPN complète avec la feuille de match (buteurs, passeurs, cartons,
    //       penalties, cleansheets) — ce que FIFA ne publie pas. Nécessite les
    //       vraies équipes, donc tourne APRÈS le fallback FIFA.
    try {
      espn = await syncKnockoutFromEspn(supabase)
    } catch (err) {
      espn.errors.push(`espnSync: ${err instanceof Error ? err.message : String(err)}`)
    }

    // Horodater les slots restés non résolus : sert de throttle au cycle suivant
    // (le resolver, lui, remet last_verified_at à null sur ce qu'il remappe).
    const stillPending = pendingKnockout
      .filter((m) => isPlaceholderApiId(m.api_match_id as number | null))
      .map((m) => m.id as string)
    if (stillPending.length > 0) {
      await supabase
        .from('matches')
        .update({ last_verified_at: now.toISOString() })
        .in('id', stillPending)
        .eq('status', 'scheduled')
    }
  }

  // ── Mode 'live' : source de vérité live = l'API (1 requête/cycle) ─────────
  // Si un match est réellement en cours côté API, on le synchronise quoi qu'il
  // arrive — filet anti-décalage horaire. Inutilisable en plan gratuit.
  let liveApiIds = new Set<number>()
  if (syncMode === 'live') {
    try {
      liveApiIds = await fetchLiveFixtureIds()
    } catch {
      // pas bloquant : on retombe sur la détection par horaire
    }
  }

  const toSync = new Set<string>()

  for (const match of matches ?? []) {
    const apiMatchId = match.api_match_id as number | null
    const status = match.status as string

    // Un placeholder du seed pointe vers une fixture sans rapport : le
    // synchroniser écrirait des player_stats parasites (vu sur la 1re
    // demi-finale). On attend le resolver, dans les deux modes.
    if (!apiMatchId || isPlaceholderApiId(apiMatchId)) continue

    const kickoff = parseMatchDateUTC(match.date as string)
    const attempts = (match.sync_attempts as number) ?? 0
    const lastVerified = match.last_verified_at
      ? new Date(match.last_verified_at as string).getTime()
      : null
    const sinceLast = lastVerified === null ? Infinity : now.getTime() - lastVerified

    if (syncMode === 'live') {
      // ── Temps réel (plan payant) ──────────────────────────────────────────
      if (liveApiIds.has(apiMatchId)) {
        toSync.add(match.id as string)
        continue
      }
      const fiveMinBefore = kickoff.getTime() - 5 * 60 * 1000
      const liveWindowEnd = kickoff.getTime() + FINAL_DELAY_MS
      const catchupEnd = kickoff.getTime() + LIVE_CATCHUP_WINDOW_MS
      const hourlyDue = attempts < MAX_POST_CHECK_ATTEMPTS && sinceLast >= RETRY_INTERVAL_MS

      if (status === 'scheduled') {
        if (now.getTime() >= fiveMinBefore && now.getTime() <= liveWindowEnd) {
          toSync.add(match.id as string)
        } else if (now.getTime() > liveWindowEnd && now.getTime() <= catchupEnd && hourlyDue) {
          toSync.add(match.id as string)
        }
      } else if (status === 'live') {
        toSync.add(match.id as string)
      } else if (status === 'finished' && hourlyDue) {
        toSync.add(match.id as string)
      }
      continue
    }

    // ── Résultat final uniquement (plan gratuit) ────────────────────────────
    // Un match déjà terminé n'est plus re-sondé : le MOTM officiel tardif est
    // rattrapé par le reconcile FIFA, gratuit.
    if (status === 'finished') continue

    // Pas encore censé terminé, ou trop ancien → aucune requête.
    const dueAt = kickoff.getTime() + FINAL_DELAY_MS
    const catchupEnd = kickoff.getTime() + CATCHUP_WINDOW_MS
    if (now.getTime() < dueAt || now.getTime() > catchupEnd) continue
    if (attempts >= MAX_SYNC_ATTEMPTS) continue
    if (sinceLast < RETRY_INTERVAL_MS) continue

    toSync.add(match.id as string)
  }

  const toSyncIds = Array.from(toSync)

  if (toSyncIds.length === 0) {
    const motmUpdated = await tryReconcileMotm(supabase)
    const recapGenerated = await tryRecap(supabase)
    return NextResponse.json({ mode: syncMode, synced: 0, matchesProcessed: 0, motmUpdated, recapGenerated, knockout, fifaFallback, espn, errors: [...knockout.errors, ...fifaFallback.errors, ...espn.errors] })
  }

  // ── Sync de chaque match ──────────────────────────────────────────────────

  const results = await Promise.allSettled(toSyncIds.map((id) => syncMatch(id)))

  let playersUpdated = 0
  const errors: string[] = []

  for (let i = 0; i < results.length; i++) {
    const result = results[i]!
    if (result.status === 'fulfilled') {
      playersUpdated += result.value.playersUpdated
      if (result.value.errors.length > 0) {
        errors.push(...result.value.errors.map((e) => `[${toSyncIds[i]}] ${e}`))
      }
    } else {
      const msg = result.reason instanceof Error ? result.reason.message : String(result.reason)
      errors.push(`[${toSyncIds[i]}] ${msg}`)
    }
  }

  const motmUpdated = await tryReconcileMotm(supabase)
  const recapGenerated = await tryRecap(supabase)

  if (knockout.errors.length > 0) errors.push(...knockout.errors.map((e) => `[knockout] ${e}`))

  return NextResponse.json({
    mode: syncMode,
    synced: playersUpdated,
    matchesProcessed: toSyncIds.length,
    motmUpdated,
    recapGenerated,
    knockout,
    fifaFallback,
    espn,
    errors,
    timestamp: now.toISOString(),
  })
}
