/**
 * map-match-ids.ts — Mappe les api_match_id Supabase vers les vrais IDs API-Football.
 *
 * Stratégie :
 *   1. Fetche tous les fixtures CdM 2026 via GET /fixtures?league=1&season=2026
 *   2. Pour chaque fixture, cherche le match correspondant en base par :
 *      - Correspondance home_team + away_team (deux niveaux : simple puis NFD)
 *      - Timestamp Unix à ±2h (7 200 000 ms) — robuste aux encodages de timezone
 *   3. Met à jour matches.api_match_id
 *   4. Affiche un diagnostic détaillé pour les fixtures non matchés
 *
 * API-Football direct : https://v3.football.api-sports.io
 * Lancement  : npx tsx scripts/map-match-ids.ts
 * Idempotent : relançable sans casser les mappings existants.
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_KEY      = process.env.RAPIDAPI_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant')
  process.exit(1)
}
if (!API_KEY) {
  console.error('❌ RAPIDAPI_KEY manquant dans .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const BASE_URL  = 'https://v3.football.api-sports.io'
const HEADERS   = { 'x-apisports-key': API_KEY }

// ── Types ─────────────────────────────────────────────────────────────────────

interface AF_Fixture {
  fixture: { id: number; date: string; status: { short: string } }
  teams: { home: { id: number; name: string }; away: { id: number; name: string } }
}

interface AF_FixtureListResponse {
  results: number
  response: AF_Fixture[]
}

interface DBMatch {
  id: string
  api_match_id: number | null
  home_team: string
  away_team: string
  date: string
}

// ── Alias noms API-Football → noms en base ────────────────────────────────────
// API-Football et notre seed Kaggle utilisent parfois des noms différents pour le même pays.

const API_ALIASES: Record<string, string[]> = {
  'Ivory Coast':        ["Côte d'Ivoire", "Cote d'Ivoire"],
  "Côte d'Ivoire":      ['Ivory Coast'],
  "Cote d'Ivoire":      ['Ivory Coast'],
  'Cape Verde Islands': ['Cabo Verde', 'Cape Verde'],
  'Cabo Verde':         ['Cape Verde Islands', 'Cape Verde'],
  'Cape Verde':         ['Cape Verde Islands', 'Cabo Verde'],
  'IR Iran':            ['Iran'],
  'Iran':               ['IR Iran'],
  'Congo DR':           ['DR Congo', 'Democratic Republic of Congo'],
  'DR Congo':           ['Congo DR'],
}

// ── Normalisation ─────────────────────────────────────────────────────────────

/**
 * Niveau 1 — simple : trim + lowercase, garde les caractères UTF-8 spéciaux.
 * "Türkiye" → "türkiye"  /  "Ivory Coast" → "ivory coast"
 */
function normSimple(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Niveau 2 — profonde : décompose NFD, retire tous les diacritiques Unicode,
 * remplace tirets/points par espace.
 * "Türkiye" → "turkiye"  /  "Bosnia & Herzegovina" → "bosnia  herzegovina"
 */
function normDeep(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    // plages Unicode des combining diacritical marks (U+0300–U+036F, U+1DC0–U+1DFF, U+FE20–U+FE2F)
    .replace(/[̀-ͯ᷀-᷿︠-︯]/g, '')
    .replace(/[-_'.&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Retourne true si les deux noms désignent la même équipe.
 * Essaie d'abord la normalisation simple (préserve ü, ã, etc.),
 * puis la normalisation profonde (élimine tous les diacritiques).
 */
function teamsMatchDirect(a: string, b: string): boolean {
  const sa = normSimple(a), sb = normSimple(b)
  if (sa === sb || sa.includes(sb) || sb.includes(sa)) return true
  const da = normDeep(a), db = normDeep(b)
  return da === db || da.includes(db) || db.includes(da)
}

function teamsMatch(a: string, b: string): boolean {
  if (teamsMatchDirect(a, b)) return true
  for (const alias of (API_ALIASES[a.trim()] ?? [])) {
    if (teamsMatchDirect(alias, b)) return true
  }
  for (const alias of (API_ALIASES[b.trim()] ?? [])) {
    if (teamsMatchDirect(a, alias)) return true
  }
  return false
}

// ── Comparaison de dates ──────────────────────────────────────────────────────

// ±4h — les dates DB sont stockées avec ~3h d'avance sur UTC (heure locale des stades)
const TOLERANCE_MS = 4 * 60 * 60 * 1000

// Fenêtre élargie pour le diagnostic (3 jours)
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

function tsMs(iso: string): number {
  // DB dates stockées sans suffixe timezone → les traiter comme UTC pour éviter le décalage local.
  const normalized = /[Zz]$|[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + 'Z'
  return new Date(normalized).getTime()
}

function dateDiffMs(a: string, b: string): number {
  return Math.abs(tsMs(a) - tsMs(b))
}

// ── Diagnostic des non-matchés ────────────────────────────────────────────────

function printUnmatched(fixture: AF_Fixture, dbMatches: DBMatch[]) {
  const fDate = fixture.fixture.date
  const fHome = fixture.teams.home.name
  const fAway = fixture.teams.away.name
  const fTs   = tsMs(fDate)

  console.log(`\n   ┌─ API  : ${fHome} vs ${fAway}`)
  console.log(`   │  date : ${fDate}`)

  // Candidats en base proches en date (3 jours), triés par proximité temporelle
  const candidates = dbMatches
    .filter(m => Math.abs(tsMs(m.date) - fTs) <= THREE_DAYS_MS)
    .sort((a, b) => dateDiffMs(a.date, fDate) - dateDiffMs(b.date, fDate))
    .slice(0, 4)

  if (candidates.length === 0) {
    console.log('   └─ base : aucun match dans une fenêtre de ±3 jours')
  } else {
    console.log('   │  candidats en base (±3j) :')
    for (const c of candidates) {
      const diff = Math.round(dateDiffMs(c.date, fDate) / 60_000)
      const nameOk   = teamsMatch(c.home_team, fHome) && teamsMatch(c.away_team, fAway)
      const marker   = nameOk ? '✓nom' : '?nom'
      console.log(`   │    [${marker}  Δ${diff}min]  ${c.home_team} vs ${c.away_team}  (${c.date})`)
    }
    console.log('   └─')
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Fetch fixtures API-Football
  console.log('🌐 Fetch des fixtures CdM 2026 depuis API-Football...')
  const res = await fetch(`${BASE_URL}/fixtures?league=1&season=2026`, { headers: HEADERS })

  if (!res.ok) {
    console.error(`❌ API-Football HTTP ${res.status}: ${res.statusText}`)
    process.exit(1)
  }

  const json   = await res.json() as AF_FixtureListResponse
  const fixtures = json.response ?? []
  console.log(`   → ${fixtures.length} fixtures reçus`)

  if (fixtures.length === 0) {
    console.log('⚠️  Aucun fixture reçu. Vérifiez RAPIDAPI_KEY et que league=1 / season=2026 est correct.')
    console.log('   Réponse brute :', JSON.stringify(json).slice(0, 300))
    process.exit(0)
  }

  // 2. Charger tous les matchs Supabase
  const { data: dbMatches, error: dbErr } = await supabase
    .from('matches')
    .select('id, api_match_id, home_team, away_team, date')

  if (dbErr) {
    console.error('❌ Erreur Supabase :', dbErr.message)
    process.exit(1)
  }

  const matches = (dbMatches ?? []) as DBMatch[]
  console.log(`   → ${matches.length} matchs en base\n`)

  // 3. Matching fixture ↔ match
  let mapped       = 0
  let alreadyMapped = 0
  const unmatched: AF_Fixture[] = []

  for (const fixture of fixtures) {
    const fDate = fixture.fixture.date
    const fHome = fixture.teams.home.name
    const fAway = fixture.teams.away.name
    const fId   = fixture.fixture.id

    const candidate = matches.find((m) => {
      return dateDiffMs(m.date, fDate) <= TOLERANCE_MS
        && teamsMatch(m.home_team, fHome)
        && teamsMatch(m.away_team, fAway)
    })

    if (!candidate) {
      unmatched.push(fixture)
      continue
    }

    if (candidate.api_match_id === fId) {
      alreadyMapped++
      continue
    }

    const { error: updateErr } = await supabase
      .from('matches')
      .update({ api_match_id: fId })
      .eq('id', candidate.id)

    if (updateErr) {
      console.error(`❌ Erreur update ${candidate.id}: ${updateErr.message}`)
    } else {
      console.log(`   ✅ ${fHome} vs ${fAway} → api_match_id=${fId}`)
      mapped++
      candidate.api_match_id = fId  // évite les doublons si l'API renvoie ce fixture plusieurs fois
    }
  }

  // 4. Résumé
  console.log('\n📊 Résumé :')
  console.log(`   ✅ ${mapped} matchs mappés`)
  console.log(`   ↩️  ${alreadyMapped} déjà mappés (inchangés)`)

  if (unmatched.length > 0) {
    console.log(`\n❌ ${unmatched.length} fixtures sans correspondance en base :`)
    for (const f of unmatched) {
      printUnmatched(f, matches)
    }
    console.log('\n   → Causes possibles :')
    console.log('     1. Nom d\'équipe différent entre API-Football et la base (voir [?nom] ci-dessus)')
    console.log('     2. Date stockée dans un fuseau horaire décalé de plus de ±2h')
    console.log('     3. Fixture absent de la base (pas encore seedé)')
  }
}

main().catch((err) => {
  console.error('❌ Erreur inattendue :', err)
  process.exit(1)
})
