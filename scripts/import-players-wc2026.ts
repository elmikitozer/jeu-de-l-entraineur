/**
 * import-players-wc2026.ts — Import complet des joueurs sélectionnés pour la CdM 2026.
 *
 * Étape 1 : GET /teams?league=1&season=2026 → 48 équipes qualifiées
 * Étape 2 : GET /players/squads?team={id} → joueurs de chaque équipe
 * Étape 3 : mapping position API → GK | DEF | MID | FWD
 * Étape 4 : nationality_code via lib/flags.ts (getCountryCode)
 * Étape 5 : upsert dans players sur api_football_id (UNIQUE)
 *
 * Rate limiting : 600ms entre chaque appel squad (48 appels)
 * Idempotent : upsert, pas insert
 * Lancement : npx tsx scripts/import-players-wc2026.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { getCountryCode } from '../lib/flags'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// ── Config ─────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_KEY      = process.env.RAPIDAPI_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local')
  process.exit(1)
}
if (!API_KEY) {
  console.error('❌ RAPIDAPI_KEY manquant dans .env.local')
  process.exit(1)
}

const supabase  = createClient(SUPABASE_URL, SERVICE_KEY)
const BASE_URL  = 'https://v3.football.api-sports.io'
const HEADERS   = { 'x-apisports-key': API_KEY }
const DELAY_MS  = 600

// ── Position mapping ──────────────────────────────────────────────────────────

const POSITION_MAP: Record<string, string> = {
  'Goalkeeper': 'GK',
  'Defender':   'DEF',
  'Midfielder': 'MID',
  'Attacker':   'FWD',
}

// ── Types API-Football ────────────────────────────────────────────────────────

interface AF_TeamEntry {
  team: {
    id:   number
    name: string
    logo: string
  }
}

interface AF_SquadPlayer {
  id:       number
  name:     string
  age:      number
  number:   number | null
  position: string
  photo:    string
}

interface AF_SquadEntry {
  team: {
    id:   number
    name: string
  }
  players: AF_SquadPlayer[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchTeams(): Promise<AF_TeamEntry[]> {
  const url = `${BASE_URL}/teams?league=1&season=2026`
  const res  = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`HTTP ${res.status} — GET /teams`)
  const json = await res.json() as { response: AF_TeamEntry[] }
  return json.response ?? []
}

async function fetchSquad(teamId: number): Promise<AF_SquadEntry | null> {
  const url = `${BASE_URL}/players/squads?team=${teamId}`
  const res  = await fetch(url, { headers: HEADERS })
  if (!res.ok) {
    console.error(`   ❌ HTTP ${res.status} — GET /players/squads?team=${teamId}`)
    return null
  }
  const json = await res.json() as { response: AF_SquadEntry[] }
  return json.response?.[0] ?? null
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // ── Étape 1 : équipes ──────────────────────────────────────────────────────
  console.log('🌍 Récupération des équipes CdM 2026 (league=1, season=2026)...')
  let teams: AF_TeamEntry[]
  try {
    teams = await fetchTeams()
  } catch (err) {
    console.error('❌ Impossible de récupérer les équipes :', err)
    process.exit(1)
  }
  console.log(`✅ ${teams.length} équipes trouvées\n`)

  // Pré-charger les api_football_id déjà en base pour distinguer inserts/updates
  const { data: existingData } = await supabase
    .from('players')
    .select('api_football_id')
    .not('api_football_id', 'is', null)
  const existingIds = new Set(
    (existingData ?? []).map(p => (p as { api_football_id: number }).api_football_id)
  )

  // ── Étape 2–5 : squads + upsert ─────────────────────────────────────────────
  let totalInserted = 0
  let totalUpdated  = 0
  let totalSkipped  = 0
  let totalErrors   = 0
  const errorTeams: string[] = []

  for (let i = 0; i < teams.length; i++) {
    const { team } = teams[i]
    process.stdout.write(`[${String(i + 1).padStart(2)}/${teams.length}] ${team.name}... `)

    const squad = await fetchSquad(team.id)

    if (!squad) {
      console.log('❌ squad introuvable')
      totalErrors++
      errorTeams.push(team.name)
      await sleep(DELAY_MS)
      continue
    }

    const teamName = squad.team.name

    // Étape 4 : nationality_code via flags.ts
    const nationalityCode = getCountryCode(teamName)
    if (!nationalityCode) {
      console.log(`⚠️  code ISO inconnu pour "${teamName}" — équipe ignorée`)
      totalErrors++
      errorTeams.push(teamName)
      await sleep(DELAY_MS)
      continue
    }

    // Étape 3 : filtrer joueurs avec position connue
    const validPlayers   = squad.players.filter(p => POSITION_MAP[p.position] !== undefined)
    const skippedPlayers = squad.players.length - validPlayers.length
    totalSkipped += skippedPlayers

    if (validPlayers.length === 0) {
      console.log(`⚠️  aucun joueur avec position valide`)
      await sleep(DELAY_MS)
      continue
    }

    // Comptage inserts vs updates pour ce batch
    let batchInserted = 0
    let batchUpdated  = 0
    for (const p of validPlayers) {
      if (existingIds.has(p.id)) batchUpdated++
      else                       batchInserted++
    }

    // Étape 5 : upsert sur api_football_id (UNIQUE)
    const rows = validPlayers.map(p => ({
      name:             p.name,
      nationality:      teamName,
      nationality_code: nationalityCode,
      position:         POSITION_MAP[p.position],
      photo_url:        p.photo || null,
      api_football_id:  p.id,
    }))

    const { error } = await supabase
      .from('players')
      .upsert(rows, { onConflict: 'api_football_id' })

    if (error) {
      console.log(`❌ upsert échoué : ${error.message}`)
      totalErrors++
      errorTeams.push(teamName)
      await sleep(DELAY_MS)
      continue
    }

    totalInserted += batchInserted
    totalUpdated  += batchUpdated

    // Mise à jour du Set local pour les passes suivantes
    for (const p of validPlayers) existingIds.add(p.id)

    const detail = batchInserted > 0 && batchUpdated > 0
      ? `${batchInserted} nouveaux, ${batchUpdated} mis à jour`
      : batchInserted > 0
        ? `${batchInserted} nouveaux`
        : `${batchUpdated} mis à jour`
    console.log(`✅ ${teamName} (${validPlayers.length} joueurs — ${detail})`)

    await sleep(DELAY_MS)
  }

  // ── Résumé ─────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 Résumé import joueurs CdM 2026 :')
  console.log(`   ✅ ${totalInserted} joueurs importés (nouveaux)`)
  console.log(`   🔄 ${totalUpdated} joueurs mis à jour`)
  if (totalSkipped > 0) {
    console.log(`   ⏭️  ${totalSkipped} joueurs ignorés (position non définie)`)
  }
  if (totalErrors > 0) {
    console.log(`   ❌ ${totalErrors} équipes en erreur :`)
    for (const name of errorTeams) console.log(`      - ${name}`)
  }
  console.log(`   📦 Total traité : ${totalInserted + totalUpdated} joueurs`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(err => {
  console.error('❌ Erreur inattendue :', err)
  process.exit(1)
})
