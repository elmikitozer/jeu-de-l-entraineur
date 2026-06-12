import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as getSupabase } from '@/lib/supabase-clients'
import type { Player } from '@/lib/types'
import { syncRetroactive } from '@/lib/sync-retroactive'
import { isAdminAuthenticated } from '@/lib/admin-guard'

// Slot → position attendue (formation 4-3-3)
const SLOT_POSITION: Record<number, Player['position']> = {
  1: 'GK',
  2: 'DEF', 3: 'DEF', 4: 'DEF', 5: 'DEF',
  6: 'MID', 7: 'MID', 8: 'MID',
  9: 'FWD', 10: 'FWD', 11: 'FWD',
}

// ── GET /api/admin/teams ────────────────────────────────────────────────────

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const supabase = getSupabase()

  const [participantsRes, teamsRes] = await Promise.all([
    supabase.from('participants').select('*').order('name'),
    supabase
      .from('teams')
      .select(
        'participant_id, slot, players(id, name, nationality, nationality_code, position, photo_url, api_football_id)'
      ),
  ])

  if (participantsRes.error) {
    return NextResponse.json({ error: participantsRes.error.message }, { status: 500 })
  }
  if (teamsRes.error) {
    return NextResponse.json({ error: teamsRes.error.message }, { status: 500 })
  }

  // Supabase retourne players comme objet unique (relation many-to-one via FK player_id)
  type RawTeam = { participant_id: string; slot: number; players: Player | null }
  const rawTeams = teamsRes.data as unknown as RawTeam[]

  const slotsByParticipant = new Map<string, Array<{ slot: number; player: Player }>>()
  for (const row of rawTeams) {
    if (!row.players) continue
    const arr = slotsByParticipant.get(row.participant_id) ?? []
    arr.push({ slot: row.slot, player: row.players })
    slotsByParticipant.set(row.participant_id, arr)
  }

  const participants = (participantsRes.data ?? []).map((p) => ({
    ...p,
    team: slotsByParticipant.get(p.id) ?? [],
  }))

  return NextResponse.json({ participants })
}

// ── POST /api/admin/teams ───────────────────────────────────────────────────

interface PostSlot {
  slot: number
  player_id: string
}

interface PostBody {
  participant_name: string
  slots: PostSlot[]
  retroactive?: boolean
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  let body: PostBody
  try {
    body = (await request.json()) as PostBody
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const { participant_name, slots, retroactive = false } = body

  // ── Validation de la structure ─────────────────────────────────────────
  if (!participant_name || typeof participant_name !== 'string' || !participant_name.trim()) {
    return NextResponse.json({ error: 'Nom du participant requis' }, { status: 400 })
  }
  if (!Array.isArray(slots) || slots.length !== 11) {
    return NextResponse.json(
      { error: `11 joueurs attendus, ${Array.isArray(slots) ? slots.length : 0} reçus` },
      { status: 400 }
    )
  }

  const slotNumbers = slots.map((s) => s.slot)
  const expectedSlots = Array.from({ length: 11 }, (_, i) => i + 1)
  const missingSlots = expectedSlots.filter((n) => !slotNumbers.includes(n))
  if (missingSlots.length > 0) {
    return NextResponse.json(
      { error: `Slots manquants : ${missingSlots.join(', ')}` },
      { status: 400 }
    )
  }

  const playerIds = slots.map((s) => s.player_id)
  if (new Set(playerIds).size !== playerIds.length) {
    return NextResponse.json({ error: 'Un joueur est sélectionné plusieurs fois' }, { status: 400 })
  }

  // ── Fetch des joueurs pour validation ─────────────────────────────────
  const supabase = getSupabase()

  const { data: playersData, error: playersError } = await supabase
    .from('players')
    .select('id, name, nationality, nationality_code, position, photo_url, api_football_id')
    .in('id', playerIds)

  if (playersError) {
    return NextResponse.json({ error: playersError.message }, { status: 500 })
  }
  if ((playersData ?? []).length !== 11) {
    return NextResponse.json({ error: 'Un ou plusieurs joueurs introuvables' }, { status: 400 })
  }

  const playerMap = new Map((playersData as Player[]).map((p) => [p.id, p]))

  // ── Validation position × slot (seul GK est strict) ─────────────────
  const posErrors: string[] = []
  for (const { slot, player_id } of slots) {
    const player = playerMap.get(player_id)
    if (!player) continue
    const expected = SLOT_POSITION[slot]
    const valid = expected === 'GK' ? player.position === 'GK' : player.position !== 'GK'
    if (!valid) {
      posErrors.push(`Slot ${slot} : gardien attendu / reçu, incompatible (${player.name})`)
    }
  }
  if (posErrors.length > 0) {
    return NextResponse.json({ error: posErrors.join(' | ') }, { status: 400 })
  }

  // ── Validation nationalité (max 3 par pays) ───────────────────────────
  const natCount: Record<string, number> = {}
  for (const { player_id } of slots) {
    const player = playerMap.get(player_id)
    if (!player) continue
    natCount[player.nationality] = (natCount[player.nationality] ?? 0) + 1
  }
  const natErrors = Object.entries(natCount)
    .filter(([, n]) => n > 3)
    .map(([nat, n]) => `${nat} : ${n} joueurs (max 3)`)
  if (natErrors.length > 0) {
    return NextResponse.json({ error: natErrors.join(' | ') }, { status: 400 })
  }

  // ── Upsert participant ────────────────────────────────────────────────
  const name = participant_name.trim()

  const { data: existing } = await supabase
    .from('participants')
    .select('id')
    .eq('name', name)
    .maybeSingle()

  let participantId: string

  if (existing) {
    participantId = existing.id
  } else {
    const { data: created, error: createError } = await supabase
      .from('participants')
      .insert({ name })
      .select('id')
      .single()

    if (createError || !created) {
      return NextResponse.json(
        { error: createError?.message ?? 'Erreur création participant' },
        { status: 500 }
      )
    }
    participantId = created.id
  }

  // ── Remplacer l'équipe ────────────────────────────────────────────────
  await supabase.from('teams').delete().eq('participant_id', participantId)

  const { error: insertError } = await supabase.from('teams').insert(
    slots.map(({ slot, player_id }) => ({
      participant_id: participantId,
      player_id,
      slot,
    }))
  )

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  if (retroactive) {
    const retroPoints = await syncRetroactive(participantId)
    return NextResponse.json({ success: true, participant_id: participantId, retro_points: retroPoints })
  }

  return NextResponse.json({ success: true, participant_id: participantId })
}

// ── DELETE /api/admin/teams?participantId={id} ──────────────────────────────

export async function DELETE(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const participantId = new URL(request.url).searchParams.get('participantId')
  if (!participantId) {
    return NextResponse.json({ error: 'participantId requis' }, { status: 400 })
  }

  const supabase = getSupabase()

  await supabase.from('teams').delete().eq('participant_id', participantId)

  const { error } = await supabase.from('participants').delete().eq('id', participantId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
