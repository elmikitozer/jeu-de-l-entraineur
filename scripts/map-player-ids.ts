/**
 * map-player-ids.ts — Mappe api_football_id pour les joueurs sans ID.
 *
 * Stratégie :
 *   1. Charge tous les joueurs avec api_football_id = null
 *   2. Pour chaque joueur, recherche via GET /players?name={nom}&season=2026
 *   3. Sélectionne le meilleur match par : nom exact > nom partiel + nationalité
 *   4. Met à jour players.api_football_id dans Supabase
 *   5. Attend 600ms entre chaque appel (limite ~100 req/jour sur le plan gratuit)
 *
 * API-Football direct : https://v3.football.api-sports.io
 * Lancement : npx tsx scripts/map-player-ids.ts
 * Idempotent : ne touche que les joueurs avec api_football_id = null.
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_KEY = process.env.RAPIDAPI_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant')
  process.exit(1)
}
if (!API_KEY) {
  console.error('❌ RAPIDAPI_KEY manquant dans .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const BASE_URL = 'https://v3.football.api-sports.io'
const HEADERS = { 'x-apisports-key': API_KEY }

// ── Types ─────────────────────────────────────────────────────────────────────

interface AF_PlayerResult {
  player: {
    id: number
    name: string
    firstname: string
    lastname: string
    nationality: string
  }
  statistics: Array<{
    team: { id: number; name: string }
    league: { id: number; name: string; season: number }
  }>
}

interface AF_PlayersSearchResponse {
  results: number
  response: AF_PlayerResult[]
}

interface DBPlayer {
  id: string
  name: string
  nationality: string
  nationality_code: string
  position: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[-_'.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Score de correspondance entre un résultat API et un joueur DB.
 * Score plus élevé = meilleur match.
 */
function matchScore(result: AF_PlayerResult, dbPlayer: DBPlayer): number {
  const apiName = normalize(result.player.name)
  const dbName = normalize(dbPlayer.name)
  const apiNationality = normalize(result.player.nationality)
  const dbNationality = normalize(dbPlayer.nationality)

  let score = 0

  // Correspondance de nom
  if (apiName === dbName) score += 100
  else if (apiName.includes(dbName) || dbName.includes(apiName)) score += 60
  else {
    // Vérifier nom + prénom séparément
    const apiFull = normalize(`${result.player.firstname} ${result.player.lastname}`)
    if (apiFull === dbName || apiFull.includes(dbName) || dbName.includes(apiFull)) score += 50
  }

  // Correspondance de nationalité
  if (apiNationality === dbNationality) score += 30
  else if (apiNationality.includes(dbNationality) || dbNationality.includes(apiNationality)) score += 15

  return score
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Charger les joueurs sans ID
  const { data: rawPlayers, error: dbErr } = await supabase
    .from('players')
    .select('id, name, nationality, nationality_code, position')
    .is('api_football_id', null)

  if (dbErr) {
    console.error('❌ Erreur Supabase :', dbErr.message)
    process.exit(1)
  }

  const players = (rawPlayers ?? []) as DBPlayer[]
  console.log(`🔍 ${players.length} joueurs sans api_football_id à mapper\n`)

  if (players.length === 0) {
    console.log('✅ Tous les joueurs ont déjà un api_football_id.')
    return
  }

  let mapped = 0
  const notFound: string[] = []

  // 2. Pour chaque joueur
  for (let i = 0; i < players.length; i++) {
    const player = players[i]
    console.log(`[${i + 1}/${players.length}] Recherche : ${player.name} (${player.nationality_code})`)

    // Encode le nom pour l'URL (prend le premier token pour les noms composés)
    const searchName = encodeURIComponent(player.name)
    const url = `${BASE_URL}/players?name=${searchName}&season=2026`

    let results: AF_PlayerResult[] = []

    try {
      const res = await fetch(url, { headers: HEADERS })
      if (!res.ok) {
        console.error(`   ❌ HTTP ${res.status} pour "${player.name}"`)
        notFound.push(player.name)
        await sleep(600)
        continue
      }

      const json = await res.json() as AF_PlayersSearchResponse
      results = json.response ?? []
    } catch (err) {
      console.error(`   ❌ Erreur réseau pour "${player.name}":`, err)
      notFound.push(player.name)
      await sleep(600)
      continue
    }

    if (results.length === 0) {
      // Essayer avec le nom de famille uniquement
      const lastName = player.name.split(' ').slice(-1)[0]
      try {
        const res2 = await fetch(`${BASE_URL}/players?name=${encodeURIComponent(lastName)}&season=2026`, { headers: HEADERS })
        if (res2.ok) {
          const json2 = await res2.json() as AF_PlayersSearchResponse
          results = json2.response ?? []
        }
      } catch {}
    }

    if (results.length === 0) {
      console.log(`   ⚠️  Aucun résultat pour "${player.name}" → à mapper manuellement`)
      notFound.push(player.name)
      await sleep(600)
      continue
    }

    // Trouver le meilleur candidat
    let bestResult: AF_PlayerResult | null = null
    let bestScore = 0

    for (const result of results) {
      const score = matchScore(result, player)
      if (score > bestScore) {
        bestScore = score
        bestResult = result
      }
    }

    // Score minimum de 50 pour accepter le match
    if (!bestResult || bestScore < 50) {
      console.log(`   ⚠️  Pas de match fiable pour "${player.name}" (score=${bestScore}) → à mapper manuellement`)
      notFound.push(player.name)
      await sleep(600)
      continue
    }

    console.log(`   → Candidat : ${bestResult.player.name} (${bestResult.player.nationality}) id=${bestResult.player.id} [score=${bestScore}]`)

    // Vérifier que cet api_football_id n'est pas déjà utilisé
    const { data: existing } = await supabase
      .from('players')
      .select('id, name')
      .eq('api_football_id', bestResult.player.id)
      .limit(1)

    if (existing && existing.length > 0) {
      const conflict = existing[0] as { id: string; name: string }
      if (conflict.id !== player.id) {
        console.log(`   ⚠️  Conflit : id=${bestResult.player.id} déjà utilisé par "${conflict.name}" → skip`)
        notFound.push(player.name)
        await sleep(600)
        continue
      }
    }

    // Mettre à jour
    const { error: updateErr } = await supabase
      .from('players')
      .update({ api_football_id: bestResult.player.id })
      .eq('id', player.id)

    if (updateErr) {
      console.error(`   ❌ Erreur update : ${updateErr.message}`)
      notFound.push(player.name)
    } else {
      console.log(`   ✅ api_football_id=${bestResult.player.id}`)
      mapped++
    }

    // Rate limiting : 600ms entre chaque appel (~100 req/min max)
    await sleep(600)
  }

  // 3. Résumé
  console.log('\n📊 Résumé :')
  console.log(`   ✅ ${mapped} joueurs mappés`)
  if (notFound.length > 0) {
    console.log(`   ❌ ${notFound.length} joueurs à mapper manuellement :`)
    for (const name of notFound) console.log(`      - ${name}`)
    console.log('\n   → Pour ces joueurs, mettre à jour api_football_id directement dans Supabase Dashboard')
    console.log('     ou relancer le script avec un nom différent dans seed-players.ts')
  }
}

main().catch((err) => {
  console.error('❌ Erreur inattendue :', err)
  process.exit(1)
})
