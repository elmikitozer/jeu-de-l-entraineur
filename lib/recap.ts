/**
 * recap.ts — Chronique du soir générée par IA.
 *
 * Déclenchée après le dernier match d'une journée (depuis le cron de sync) :
 * une fois tous les matchs d'un jour terminés, génère un récap mordant via
 * claude-sonnet-4-6 et le stocke dans daily_recaps (une fois, immuable).
 *
 * Appel API direct via fetch (pas de SDK) — nécessite ANTHROPIC_API_KEY.
 * Sans la clé, no-op silencieux.
 */

import type { createServiceClient } from './supabase-clients'
import { TEAM_NAME_FR } from './flags'

type SB = ReturnType<typeof createServiceClient>

const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `Tu es le commentateur sarcastique et affectueux d'un jeu de fantasy football entre amis, sur la Coupe du Monde 2026.

Le jeu : chaque participant a sélectionné 11 vrais joueurs avant le tournoi. Il marque des points selon les performances INDIVIDUELLES de ses joueurs — but, passe décisive, homme du match, clean sheet du gardien, carton — et PAS selon le résultat des matchs.

Écris la chronique du soir en français, 3 à 4 phrases, mordante mais jamais méchante, dans le style d'un pote qui chambre. Centre-la sur les joueurs qui ont rapporté ou coûté des points à leurs propriétaires fantasy — pas sur le score des rencontres.

Bon angle : « le but de Quiñones a fait le bonheur de Gregoire » plutôt que « le Mexique a écrasé l'Afrique du Sud ».

Utilise les vrais prénoms des participants. Pas d'emoji. Pas de titre ni de préambule : écris directement la chronique.`

/** Appel Messages API (claude-sonnet-4-6, 200 tokens). Renvoie le texte ou null. */
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
        max_tokens: 200,
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

  // Regroupe par jour UTC ; ne garde que les jours dont TOUS les matchs sont terminés.
  const byDay = new Map<string, MatchRow[]>()
  for (const m of rows) {
    const day = m.date.slice(0, 10)
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(m)
  }
  const completeDays = Array.from(byDay.entries())
    .filter(([, ms]) => ms.every((m) => m.status === 'finished'))
    .map(([day]) => day)
    .sort((a, b) => b.localeCompare(a))
  if (completeDays.length === 0) return { generated: false }

  const day = completeDays[0]

  // Déjà générée ?
  const { data: existing } = await supabase
    .from('daily_recaps')
    .select('recap_date')
    .eq('recap_date', day)
    .maybeSingle()
  if (existing) return { generated: false }

  // ── Données de la journée ────────────────────────────────────────────────
  const dayMatchIds = byDay.get(day)!.map((m) => m.id)

  // Points gagnés/perdus aujourd'hui par participant
  const { data: logs } = await supabase
    .from('points_log')
    .select('participant_id, total_points')
    .in('match_id', dayMatchIds)

  const gain = new Map<string, number>()
  for (const l of (logs ?? []) as Array<{ participant_id: string; total_points: number }>) {
    gain.set(l.participant_id, (gain.get(l.participant_id) ?? 0) + (l.total_points || 0))
  }

  const { data: participants } = await supabase
    .from('participants')
    .select('id, name, total_points')
    .order('total_points', { ascending: false })
  const parts = (participants ?? []) as Array<{ id: string; name: string; total_points: number }>
  const nameById = new Map(parts.map((p) => [p.id, p.name]))

  const movers = Array.from(gain.entries())
    .filter(([, v]) => v !== 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id, v]) => `${nameById.get(id) ?? '?'} ${v > 0 ? '+' : ''}${v}`)

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
    return `- ${p?.name ?? '?'} (${nat}) : ${acts.join(', ')} — ${owners.length ? owners.join(', ') : 'personne'}`
  })

  const standings = parts.map((p, i) => `${i + 1}. ${p.name} ${p.total_points}`)

  const userPrompt = [
    `Performances individuelles du jour (joueur — fait — propriétaire(s) fantasy) :`,
    perfLines.join('\n') || '(aucune performance notable)',
    ``,
    `Points gagnés/perdus aujourd'hui :`,
    movers.join('\n') || "(personne n'a marqué de points)",
    ``,
    `Classement général :`,
    standings.join('\n'),
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
