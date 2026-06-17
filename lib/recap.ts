/**
 * recap.ts — Chronique du jour générée par IA.
 *
 * Déclenchée dès qu'une journée vient de se terminer (depuis le cron de sync) :
 * une fois TOUS les matchs d'une journée terminés, génère et publie
 * immédiatement un récap mordant via claude-sonnet-4-6 et le stocke dans
 * daily_recaps (une fois, immuable). Pas de règle d'horaire.
 *
 * Une « journée » = un jour calendaire dans le fuseau hôte (CdM 2026 en
 * Amérique de l'Ouest, PDT = UTC-7). On regroupe par jour-hôte plutôt que par
 * jour UTC pour ne pas scinder un même bloc de soirée qui franchit minuit UTC
 * (ex. coups d'envoi de 19:00 UTC à 04:00 UTC le lendemain = une seule
 * journée locale).
 *
 * Appel API direct via fetch (pas de SDK) — nécessite ANTHROPIC_API_KEY.
 * Sans la clé, no-op silencieux.
 */

import type { createServiceClient } from './supabase-clients'
import { TEAM_NAME_FR } from './flags'
import { parseMatchDateUTC } from './datetime'

type SB = ReturnType<typeof createServiceClient>

const MODEL = 'claude-sonnet-4-6'

// Fuseau hôte CdM 2026 (côte ouest US, PDT = UTC-7 sur toute la compétition,
// été 2026 sans changement d'heure). Sert à dériver le « jour-hôte » d'un match.
const HOST_TZ_OFFSET_MS = 7 * 60 * 60 * 1000

// Filet de sécurité : si un match reste bloqué en 'scheduled' (bug API), la
// journée ne doit jamais geler indéfiniment. Passé ce délai après le dernier
// coup d'envoi prévu de la journée, on publie avec les matchs disponibles.
const SAFETY_TIMEOUT_MS = 48 * 60 * 60 * 1000

/** Jour calendaire dans le fuseau hôte (UTC-7), au format YYYY-MM-DD. */
function hostDay(date: string): string {
  return new Date(parseMatchDateUTC(date).getTime() - HOST_TZ_OFFSET_MS)
    .toISOString()
    .slice(0, 10)
}

const SYSTEM_PROMPT = `Tu es le commentateur sarcastique et affectueux d'un jeu de fantasy football entre amis.
Le jeu fonctionne ainsi : chaque participant a sélectionné 11 joueurs réels avant le tournoi. Il gagne des points selon les performances individuelles de ses joueurs (buts, passes décisives, cartons, cleansheet, MOTM...), pas selon les résultats des matchs.
Rédige un récap de la journée en français correct et soutenu, 4-5 phrases complètes, mordant mais jamais méchant, centré sur les performances individuelles qui ont fait gagner ou perdre des points aux participants.
Bon angle : 'Le but de Quinones a fait le bonheur de Gregoire' plutôt que 'Le Mexique a écrasé l'Afrique du Sud'.
Utilise les vrais prénoms des participants. Pas d'emoji. Style chronique sportive de pote.
Ne commence jamais par le nom d'un participant.
Chaque phrase doit être grammaticalement complète — ne jamais s'arrêter en milieu de phrase.`

/** Appel Messages API (claude-sonnet-4-6, 600 tokens). Renvoie le texte ou null. */
async function callClaude(userPrompt: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    console.warn('[recap] ANTHROPIC_API_KEY absente — génération ignorée')
    return null
  }

  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        // 600 tokens : marge confortable pour 4-5 phrases complètes en français
        // (~30 tokens/phrase) + clôture propre, sans jamais couper en plein milieu.
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })
  } catch (err) {
    console.error('[recap] fetch', err instanceof Error ? err.message : String(err))
    return null
  }

  if (!res.ok) {
    console.error('[recap] HTTP', res.status, await res.text().catch(() => ''))
    return null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json()
  if (data?.stop_reason === 'refusal') return null
  const text: string = (data?.content ?? [])
    .filter((b: { type?: string }) => b.type === 'text')
    .map((b: { text?: string }) => b.text ?? '')
    .join('')
    .trim()
  return text || null
}

/**
 * Génère la chronique de la dernière journée entièrement terminée, si pas déjà faite.
 * Idempotent : ne régénère jamais une date déjà présente.
 */
export async function generateDailyRecapIfNeeded(
  supabase: SB
): Promise<{ generated: boolean; date?: string }> {
  type MatchRow = {
    id: string
    home_team: string
    away_team: string
    home_score: number | null
    away_score: number | null
    date: string
    status: string
  }

  const { data: matches } = await supabase
    .from('matches')
    .select('id, home_team, away_team, home_score, away_score, date, status')
  const rows = (matches ?? []) as unknown as MatchRow[]
  if (rows.length === 0) return { generated: false }

  // Regroupe par jour-hôte (UTC-7) ; ne garde que les journées « prêtes ».
  const byDay = new Map<string, MatchRow[]>()
  for (const m of rows) {
    const day = hostDay(m.date)
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(m)
  }
  const now = Date.now()
  // Une journée est prête si TOUS ses matchs sont terminés — ou, filet de
  // sécurité, si 48h se sont écoulées depuis son dernier coup d'envoi prévu
  // (un match resté 'scheduled' à cause d'un bug ne doit pas la geler).
  const completeDays = Array.from(byDay.entries())
    .filter(([, ms]) => {
      if (ms.every((m) => m.status === 'finished')) return true
      const lastKickoff = Math.max(...ms.map((m) => parseMatchDateUTC(m.date).getTime()))
      return now - lastKickoff > SAFETY_TIMEOUT_MS
    })
    .map(([day]) => day)
    .sort((a, b) => b.localeCompare(a))
  if (completeDays.length === 0) return { generated: false }

  // On prend le jour complet le PLUS RÉCENT qui n'a pas encore de chronique —
  // et pas seulement completeDays[0]. Sinon, un jour manqué (ex. erreur API ce
  // soir-là) serait sauté définitivement dès que le lendemain est généré.
  const { data: existingRecaps } = await supabase.from('daily_recaps').select('recap_date')
  const done = new Set((existingRecaps ?? []).map((r) => r.recap_date as string))
  const day = completeDays.find((d) => !done.has(d))
  if (!day) return { generated: false }

  // ── Données de la journée ────────────────────────────────────────────────
  const dayMatchIds = byDay.get(day)!.map((m) => m.id)

  // Points du jour : par participant (delta) ET par joueur (points générés).
  const { data: logs } = await supabase
    .from('points_log')
    .select('participant_id, player_id, match_id, total_points')
    .in('match_id', dayMatchIds)

  const gain = new Map<string, number>()
  // player_id → (match_id → points) : dédoublonne entre propriétaires d'un même
  // joueur (tous ont le même score pour ce match) puis somme sur la journée.
  const playerMatchPts = new Map<string, Map<string, number>>()
  for (const l of (logs ?? []) as Array<{ participant_id: string; player_id: string; match_id: string; total_points: number }>) {
    gain.set(l.participant_id, (gain.get(l.participant_id) ?? 0) + (l.total_points || 0))
    let mm = playerMatchPts.get(l.player_id)
    if (!mm) { mm = new Map(); playerMatchPts.set(l.player_id, mm) }
    mm.set(l.match_id, l.total_points || 0)
  }
  const pointsByPlayer = new Map<string, number>()
  for (const [pid, mm] of Array.from(playerMatchPts.entries())) {
    pointsByPlayer.set(pid, Array.from(mm.values()).reduce((a, b) => a + b, 0))
  }

  const { data: participants } = await supabase
    .from('participants')
    .select('id, name, total_points')
    .order('total_points', { ascending: false })
  const parts = (participants ?? []) as Array<{ id: string; name: string; total_points: number }>

  // Performances individuelles du jour (le cœur du jeu) + propriétaires fantasy
  type StatRow = {
    player_id: string
    goals: number
    assists: number
    motm: boolean
    red_cards: number
    cleansheet: boolean
    players: { name: string; nationality: string; position: string } | null
  }
  const { data: statRows } = await supabase
    .from('player_stats')
    .select('player_id, goals, assists, motm, red_cards, cleansheet, players(name, nationality, position)')
    .in('match_id', dayMatchIds)
  const notable = ((statRows ?? []) as unknown as StatRow[]).filter(
    (s) =>
      s.goals > 0 ||
      s.assists > 0 ||
      s.motm ||
      s.red_cards > 0 ||
      (s.cleansheet && s.players?.position === 'GK')
  )

  // Propriétaires fantasy de ces joueurs (qui les a sélectionnés)
  const notableIds = notable.map((s) => s.player_id)
  const { data: ownerRows } = notableIds.length
    ? await supabase.from('teams').select('player_id, participants(name)').in('player_id', notableIds)
    : { data: [] as unknown[] }
  const ownersByPlayer = new Map<string, string[]>()
  for (const t of (ownerRows ?? []) as unknown as Array<{ player_id: string; participants: { name: string } | null }>) {
    const arr = ownersByPlayer.get(t.player_id) ?? []
    if (t.participants?.name) arr.push(t.participants.name)
    ownersByPlayer.set(t.player_id, arr)
  }

  const perfLines = notable.map((s) => {
    const p = s.players
    const acts: string[] = []
    if (s.goals > 0) acts.push(`${s.goals} but${s.goals > 1 ? 's' : ''}`)
    if (s.assists > 0) acts.push(`${s.assists} passe${s.assists > 1 ? 's' : ''} décisive${s.assists > 1 ? 's' : ''}`)
    if (s.motm) acts.push('homme du match')
    if (s.cleansheet && p?.position === 'GK') acts.push('clean sheet')
    if (s.red_cards > 0) acts.push('carton rouge')
    const owners = ownersByPlayer.get(s.player_id) ?? []
    const nat = p ? TEAM_NAME_FR[p.nationality] ?? p.nationality : '?'
    const pts = pointsByPlayer.get(s.player_id)
    const ptsStr = pts != null ? ` — ${pts > 0 ? '+' : ''}${pts} pts générés` : ''
    return `- ${p?.name ?? '?'} (${nat}) : ${acts.join(', ')} — ${owners.length ? owners.join(', ') : 'personne'}${ptsStr}`
  })

  // Une ligne par participant : classement général + total + variation du jour.
  const participantLines = parts.map((p, i) => {
    const d = gain.get(p.id) ?? 0
    return `${i + 1}. ${p.name} — ${p.total_points} pts au total (${d > 0 ? '+' : ''}${d} aujourd'hui)`
  })

  const userPrompt = [
    `Performances individuelles du jour (joueur — fait — propriétaire(s) fantasy — points générés) :`,
    perfLines.join('\n') || '(aucune performance notable)',
    ``,
    `Participants (classement général — total — variation du jour) :`,
    participantLines.join('\n'),
  ].join('\n')

  // console.log('[recap-debug] USER PROMPT:\n' + userPrompt + '\n[/recap-debug]')
  const content = await callClaude(userPrompt)
  if (!content) return { generated: false }

  // upsert ignoreDuplicates : à l'épreuve d'une course entre deux cycles de cron.
  const { error } = await supabase
    .from('daily_recaps')
    .upsert({ recap_date: day, content }, { onConflict: 'recap_date', ignoreDuplicates: true })
  if (error) {
    console.error('[recap] insert', error.message)
    return { generated: false }
  }

  return { generated: true, date: day }
}
