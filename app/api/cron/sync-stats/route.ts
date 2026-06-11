import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncMatch } from '@/lib/sync-engine'

// Fenêtre de rattrapage après le coup d'envoi (24h) : couvre les matchs ratés
// (cron throttlé, erreur API, ambiguïté de fuseau sur la date stockée) restés
// en 'scheduled' alors qu'ils sont déjà terminés.
const CATCHUP_WINDOW_MS = 24 * 60 * 60 * 1000
// Délai de post-check : 1h entre chaque vérification
const POST_CHECK_INTERVAL_MS = 60 * 60 * 1000
// Nombre max de vérifications post-match
const MAX_POST_CHECK_ATTEMPTS = 6

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = getSupabase()
  const now = new Date()

  // ── Identifier les matchs à synchroniser ─────────────────────────────────

  const { data: matches, error: fetchErr } = await supabase
    .from('matches')
    .select('id, date, status, last_verified_at, sync_attempts, api_match_id')
    .or('status.eq.scheduled,status.eq.live,status.eq.finished')

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  const toSync: string[] = []

  for (const match of matches ?? []) {
    const kickoff = new Date(match.date as string)
    const fiveMinBefore = new Date(kickoff.getTime() - 5 * 60 * 1000)
    const catchupEnd = new Date(kickoff.getTime() + CATCHUP_WINDOW_MS)
    const status = match.status as string
    const apiMatchId = match.api_match_id as number | null

    // Ignorer les matchs sans api_match_id (pas encore mappés)
    if (!apiMatchId) continue

    if (status === 'scheduled') {
      // De 5 min avant le coup d'envoi jusqu'à 24h après : couvre la fenêtre live
      // ET le rattrapage des matchs déjà terminés mais jamais synchronisés.
      if (now >= fiveMinBefore && now <= catchupEnd) {
        toSync.push(match.id as string)
      }
    } else if (status === 'live') {
      // Match en cours ou dépassé la fenêtre → sync (syncMatch déterminera si final)
      toSync.push(match.id as string)
    } else if (status === 'finished') {
      // Post-check : < MAX_ATTEMPTS et au moins 1h depuis le dernier sync
      const attempts = (match.sync_attempts as number) ?? 0
      if (attempts >= MAX_POST_CHECK_ATTEMPTS) continue

      const lastVerified = match.last_verified_at
        ? new Date(match.last_verified_at as string)
        : null

      const timeSinceLast = lastVerified ? now.getTime() - lastVerified.getTime() : Infinity
      if (timeSinceLast >= POST_CHECK_INTERVAL_MS) {
        toSync.push(match.id as string)
      }
    }
  }

  if (toSync.length === 0) {
    return NextResponse.json({ synced: 0, matchesProcessed: 0, errors: [] })
  }

  // ── Sync de chaque match ──────────────────────────────────────────────────

  const results = await Promise.allSettled(toSync.map((id) => syncMatch(id)))

  let playersUpdated = 0
  const errors: string[] = []

  for (let i = 0; i < results.length; i++) {
    const result = results[i]!
    if (result.status === 'fulfilled') {
      playersUpdated += result.value.playersUpdated
      if (result.value.errors.length > 0) {
        errors.push(...result.value.errors.map((e) => `[${toSync[i]}] ${e}`))
      }
    } else {
      const msg = result.reason instanceof Error ? result.reason.message : String(result.reason)
      errors.push(`[${toSync[i]}] ${msg}`)
    }
  }

  return NextResponse.json({
    synced: playersUpdated,
    matchesProcessed: toSync.length,
    errors,
    timestamp: now.toISOString(),
  })
}
