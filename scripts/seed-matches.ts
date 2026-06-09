/**
 * seed-matches.ts — Import du calendrier CdM 2026 depuis les CSV Kaggle.
 *
 * Source : scripts/kaggle/ (matches.csv + teams.csv + host_cities.csv + tournament_stages.csv)
 * Cible : table `matches` dans Supabase
 *
 * Idempotent : upsert sur api_match_id — relançable sans créer de doublons.
 *
 * Lancement :
 *   npx tsx scripts/seed-matches.ts
 *
 * Prérequis : .env.local rempli avec NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 */

import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import Papa from 'papaparse'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// ---------------------------------------------------------------------------
// Supabase admin client (service role — bypass RLS)
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variables manquantes : NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY')
  console.error('   → Remplir .env.local avant de lancer ce script')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

// ---------------------------------------------------------------------------
// Types CSV Kaggle
// ---------------------------------------------------------------------------

interface KaggleMatch {
  id: string
  match_number: string
  home_team_id: string
  away_team_id: string
  city_id: string
  stage_id: string
  kickoff_at: string
  match_label: string
}

interface KaggleTeam {
  id: string
  team_name: string
  fifa_code: string
  group_letter: string
  is_placeholder: string
}

interface KaggleCity {
  id: string
  city_name: string
  country: string
  venue_name: string
  region_cluster: string
  airport_code: string
}

interface KaggleStage {
  id: string
  stage_name: string
  stage_order: string
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

function readCsv<T>(filePath: string): T[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const result = Papa.parse<T>(content, { header: true, skipEmptyLines: true })
  if (result.errors.length > 0) {
    console.warn(`⚠️  Erreurs de parsing dans ${path.basename(filePath)} :`, result.errors)
  }
  return result.data
}

/**
 * Convertit une date locale avec offset (ex: "2026-06-11 15:00:00-06")
 * en ISO 8601 UTC (ex: "2026-06-11T21:00:00.000Z").
 */
function toUtcIso(localDateWithOffset: string): string {
  // Normalise "YYYY-MM-DD HH:MM:SS±HH" → "YYYY-MM-DDTHH:MM:SS±HH:00"
  const normalized = localDateWithOffset
    .replace(' ', 'T')
    .replace(/([+-]\d{2})$/, '$1:00')

  const d = new Date(normalized)
  if (isNaN(d.getTime())) {
    throw new Error(`Date invalide : "${localDateWithOffset}"`)
  }
  return d.toISOString()
}

/** Traduit le stage_name Kaggle (anglais) en français pour affichage. */
const STAGE_FR: Record<string, string> = {
  'Group Stage': 'Phase de groupes',
  'Round of 32': 'Tour de 32',
  'Round of 16': 'Huitièmes de finale',
  'Quarterfinals': 'Quarts de finale',
  'Semifinals': 'Demi-finales',
  'Third Place Playoff': 'Match pour la 3e place',
  'Final': 'Finale',
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const kaggleDir = path.join(process.cwd(), 'scripts', 'kaggle')

  console.log('📂 Lecture des CSV Kaggle...')

  const rawMatches = readCsv<KaggleMatch>(path.join(kaggleDir, 'matches.csv'))
  const rawTeams = readCsv<KaggleTeam>(path.join(kaggleDir, 'teams.csv'))
  const rawCities = readCsv<KaggleCity>(path.join(kaggleDir, 'host_cities.csv'))
  const rawStages = readCsv<KaggleStage>(path.join(kaggleDir, 'tournament_stages.csv'))

  // Lookup maps
  const teamsById = new Map(rawTeams.map((t) => [t.id, t]))
  const citiesById = new Map(rawCities.map((c) => [c.id, c]))
  const stagesById = new Map(rawStages.map((s) => [s.id, s]))

  console.log(`   ${rawMatches.length} matchs, ${rawTeams.length} équipes, ${rawCities.length} villes, ${rawStages.length} phases`)

  // Transform
  const matchRows = rawMatches.map((m) => {
    const homeTeam = m.home_team_id ? teamsById.get(m.home_team_id) : null
    const awayTeam = m.away_team_id ? teamsById.get(m.away_team_id) : null
    const city = citiesById.get(m.city_id)
    const stage = stagesById.get(m.stage_id)

    if (!city) throw new Error(`Ville inconnue id=${m.city_id} pour le match ${m.id}`)
    if (!stage) throw new Error(`Phase inconnue id=${m.stage_id} pour le match ${m.id}`)

    const homeName = homeTeam ? homeTeam.team_name : 'TBD'
    const awayName = awayTeam ? awayTeam.team_name : 'TBD'
    const venueName = `${city.venue_name}, ${city.city_name}`
    const stageNameFr = STAGE_FR[stage.stage_name] ?? stage.stage_name
    // Append group letter for group stage matches
    const stageFull =
      stage.stage_name === 'Group Stage' && m.match_label
        ? `Phase de groupes - Groupe ${m.match_label.replace('Group ', '')}`
        : stageNameFr

    return {
      api_match_id: parseInt(m.id, 10),
      home_team: homeName,
      away_team: awayName,
      date: toUtcIso(m.kickoff_at),
      venue: venueName,
      stage: stageFull,
      status: 'scheduled' as const,
    }
  })

  // ---------------------------------------------------------------------------
  // Upsert — idempotent via api_match_id
  // ---------------------------------------------------------------------------

  console.log(`\n🔄 Upsert de ${matchRows.length} matchs dans Supabase...`)

  // Check existing
  const { data: existing, error: fetchError } = await supabase
    .from('matches')
    .select('api_match_id')

  if (fetchError) {
    console.error('❌ Erreur lors de la lecture Supabase :', fetchError.message)
    process.exit(1)
  }

  const existingIds = new Set((existing ?? []).map((r) => r.api_match_id))
  const toInsert = matchRows.filter((r) => !existingIds.has(r.api_match_id))
  const toUpdate = matchRows.filter((r) => existingIds.has(r.api_match_id))

  let inserted = 0
  let updated = 0
  let errors = 0

  // Insert new
  if (toInsert.length > 0) {
    const { error } = await supabase.from('matches').insert(toInsert)
    if (error) {
      console.error('❌ Erreur insert :', error.message)
      errors += toInsert.length
    } else {
      inserted = toInsert.length
    }
  }

  // Update existing (upsert one by one to get accurate count)
  for (const row of toUpdate) {
    const { error } = await supabase
      .from('matches')
      .update({
        home_team: row.home_team,
        away_team: row.away_team,
        date: row.date,
        venue: row.venue,
        stage: row.stage,
        status: row.status,
      })
      .eq('api_match_id', row.api_match_id)

    if (error) {
      console.error(`❌ Erreur update match ${row.api_match_id} :`, error.message)
      errors++
    } else {
      updated++
    }
  }

  // ---------------------------------------------------------------------------
  // Rapport
  // ---------------------------------------------------------------------------

  console.log('\n✅ Seed terminé !')
  console.log(`   ✅ ${inserted} matchs insérés`)
  console.log(`   🔄 ${updated} matchs mis à jour`)
  if (errors > 0) console.log(`   ❌ ${errors} erreurs`)
  console.log(`\n📅 Période : ${matchRows[0]?.date ?? '-'} → ${matchRows[matchRows.length - 1]?.date ?? '-'}`)
  const stages = Array.from(new Set(matchRows.map((m) => m.stage)))
  console.log(`🏟️  Phases : ${stages.join(', ')}`)
}

main().catch((err) => {
  console.error('❌ Erreur inattendue :', err)
  process.exit(1)
})
