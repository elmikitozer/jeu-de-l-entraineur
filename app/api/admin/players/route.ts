import { NextResponse } from 'next/server'
import { createServiceClient as getSupabase } from '@/lib/supabase-clients'
import { isAdminAuthenticated } from '@/lib/admin-guard'

const SELECT_FIELDS = 'id, name, nationality, nationality_code, position, photo_url, api_football_id'
const PAGE_SIZE = 1000

async function getAllPlayers() {
  const supabase = getSupabase()
  const all = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('players')
      .select(SELECT_FIELDS)
      .order('position')
      .order('name')
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return all
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  try {
    const players = await getAllPlayers()
    return NextResponse.json({ players })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
