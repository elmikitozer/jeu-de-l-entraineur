/**
 * update-tbd-teams.ts — Met à jour les équipes playoffs et les libellés de phase.
 *
 * Phase 0 : Résolution des Winners Playoff en noms d'équipes réels
 *   Winner UEFA Playoff A → Bosnia & Herzegovina
 *   Winner UEFA Playoff B → Sweden
 *   Winner UEFA Playoff C → Türkiye
 *   Winner UEFA Playoff D → Czech Republic
 *   Winner FIFA Playoff%  → TBD (résultat inconnu, résolu ensuite en Phase 0.5)
 *
 * Phase 0.5 : Corrections suite à erreurs de mapping initial
 *   Haiti    → Türkiye          (playoff C était incorrectement mappé à Haiti)
 *   TBD vs Norway     → Iraq    (FIFA playoff : Irak qualifié)
 *   France vs TBD     → Iraq
 *   Senegal vs TBD    → Iraq
 *   Portugal vs TBD   → Congo DR (FIFA playoff : Congo DR qualifié)
 *   Colombia vs TBD   → Congo DR
 *   TBD vs Uzbekistan → Congo DR
 *
 * Phase 1 : Renomme stage "Tour de 32" → "16e de finales"
 * Phase 2 : Vérifie que tous les noms d'équipes en base sont mappés dans lib/flags.ts
 *
 * Idempotent : relançable sans effet de bord.
 * Lancement  : npx tsx scripts/update-tbd-teams.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Met à jour home_team et away_team pour la valeur exacte `from`. Retourne le nb de lignes mises à jour. */
async function replaceExact(from: string, to: string): Promise<number> {
  const [
    { data: homeData, error: homeErr },
    { data: awayData, error: awayErr },
  ] = await Promise.all([
    supabase.from('matches').update({ home_team: to }).eq('home_team', from).select('id'),
    supabase.from('matches').update({ away_team: to }).eq('away_team', from).select('id'),
  ])

  if (homeErr) console.error(`   ❌ home_team error: ${homeErr.message}`)
  if (awayErr) console.error(`   ❌ away_team error: ${awayErr.message}`)

  return (homeData?.length ?? 0) + (awayData?.length ?? 0)
}

/** Met à jour home_team et away_team pour les valeurs correspondant au pattern LIKE. Retourne le nb de lignes. */
async function replacePattern(pattern: string, to: string): Promise<number> {
  const [
    { data: homeData, error: homeErr },
    { data: awayData, error: awayErr },
  ] = await Promise.all([
    supabase.from('matches').update({ home_team: to }).ilike('home_team', pattern).select('id'),
    supabase.from('matches').update({ away_team: to }).ilike('away_team', pattern).select('id'),
  ])

  if (homeErr) console.error(`   ❌ home_team error: ${homeErr.message}`)
  if (awayErr) console.error(`   ❌ away_team error: ${awayErr.message}`)

  return (homeData?.length ?? 0) + (awayData?.length ?? 0)
}

function logUpdate(from: string, to: string, count: number) {
  if (count === 0) {
    console.log(`   ↩️  "${from}" : aucune ligne (déjà mis à jour ?)`)
  } else {
    console.log(`   ✅ "${from}" → "${to}" : ${count} ligne${count > 1 ? 's' : ''} mise${count > 1 ? 's' : ''} à jour`)
  }
}

/**
 * Met à jour home_team OU away_team = 'TBD' uniquement pour la paire identifiée par l'adversaire.
 * Exemple : replacePairedTBD('home', 'Norway', 'away', 'Iraq') → WHERE home_team='TBD' AND away_team='Norway'
 */
async function replacePairedTBD(
  tbdSide: 'home' | 'away',
  opponent: string,
  oppSide: 'home' | 'away',
  to: string
): Promise<number> {
  const tbdField = tbdSide === 'home' ? 'home_team' : 'away_team'
  const oppField = oppSide  === 'home' ? 'home_team' : 'away_team'
  const { data, error } = await supabase
    .from('matches')
    .update({ [tbdField]: to })
    .eq(tbdField, 'TBD')
    .eq(oppField, opponent)
    .select('id')
  if (error) console.error(`   ❌ Error: ${error.message}`)
  return data?.length ?? 0
}

// ── Phase 0 : Winners Playoff ─────────────────────────────────────────────────

async function resolvePlayoffs(): Promise<void> {
  const updates: Array<{ from: string; to: string; pattern?: boolean }> = [
    { from: 'Winner UEFA Playoff A', to: 'Bosnia & Herzegovina' },
    { from: 'Winner UEFA Playoff B', to: 'Sweden' },
    { from: 'Winner UEFA Playoff C', to: 'Türkiye' },
    { from: 'Winner UEFA Playoff D', to: 'Czech Republic' },
  ]

  for (const { from, to } of updates) {
    const count = await replaceExact(from, to)
    logUpdate(from, to, count)
  }

  // FIFA Playoff : résultat inconnu → TBD (pattern LIKE)
  const fifaCount = await replacePattern('Winner FIFA Playoff%', 'TBD')
  logUpdate('Winner FIFA Playoff%', 'TBD', fifaCount)
}

// ── Phase 0.5 : Corrections de mapping ───────────────────────────────────────

async function correctMappings(): Promise<void> {
  // Playoff C avait été incorrectement mappé à "Haiti" ; le corriger si déjà en base.
  const haitiCount = await replaceExact('Haiti', 'Türkiye')
  logUpdate('Haiti', 'Türkiye', haitiCount)

  type PairFix = { tbdSide: 'home' | 'away'; opponent: string; oppSide: 'home' | 'away'; team: string }

  // FIFA Playoff résolu : Iraq (identifié par l'adversaire)
  const iraqPairs: PairFix[] = [
    { tbdSide: 'home', opponent: 'Norway',  oppSide: 'away', team: 'Iraq' },
    { tbdSide: 'away', opponent: 'France',  oppSide: 'home', team: 'Iraq' },
    { tbdSide: 'away', opponent: 'Senegal', oppSide: 'home', team: 'Iraq' },
  ]
  for (const { tbdSide, opponent, oppSide, team } of iraqPairs) {
    const n = await replacePairedTBD(tbdSide, opponent, oppSide, team)
    logUpdate(`TBD (vs ${opponent})`, team, n)
  }

  // FIFA Playoff résolu : Congo DR (identifié par l'adversaire)
  const congoRDPairs: PairFix[] = [
    { tbdSide: 'away', opponent: 'Portugal',   oppSide: 'home', team: 'Congo DR' },
    { tbdSide: 'away', opponent: 'Colombia',   oppSide: 'home', team: 'Congo DR' },
    { tbdSide: 'home', opponent: 'Uzbekistan', oppSide: 'away', team: 'Congo DR' },
  ]
  for (const { tbdSide, opponent, oppSide, team } of congoRDPairs) {
    const n = await replacePairedTBD(tbdSide, opponent, oppSide, team)
    logUpdate(`TBD (vs ${opponent})`, team, n)
  }
}

// ── Phase 1 : Renommage des stages ────────────────────────────────────────────

async function renameStages(): Promise<void> {
  const { data: stageMatches, error: fetchErr } = await supabase
    .from('matches')
    .select('id, stage')
    .ilike('stage', '%Tour de 32%')

  if (fetchErr) {
    console.error(`   ❌ Erreur fetch stages: ${fetchErr.message}`)
    return
  }

  if (!stageMatches || stageMatches.length === 0) {
    console.log('   ↩️  Aucun stage "Tour de 32" trouvé (déjà renommé ou absent)')
    return
  }

  for (const m of stageMatches) {
    const newStage = (m.stage as string).replace(/Tour de 32/g, '16e de finales')
    const { error } = await supabase.from('matches').update({ stage: newStage }).eq('id', m.id)
    if (error) console.error(`   ❌ Erreur match ${m.id}: ${error.message}`)
  }

  console.log(`   ✅ ${stageMatches.length} stage${stageMatches.length > 1 ? 's' : ''} "Tour de 32" → "16e de finales"`)
}

// ── Phase 2 : Vérification couverture drapeaux ────────────────────────────────

async function verifyFlags(): Promise<void> {
  const { data: allMatches, error } = await supabase
    .from('matches')
    .select('home_team, away_team')

  if (error || !allMatches) {
    console.error(`   ❌ Erreur fetch matches: ${error?.message}`)
    return
  }

  // isKnownTeam distingue "non mappé" de "TBD/sans drapeau explicite"
  const { isKnownTeam } = await import('../lib/flags')

  const unknown = new Set<string>()
  for (const m of allMatches) {
    const home = m.home_team as string
    const away = m.away_team as string
    if (!isKnownTeam(home)) unknown.add(home)
    if (!isKnownTeam(away)) unknown.add(away)
  }

  if (unknown.size === 0) {
    console.log(`   ✅ Tous les noms d'équipes (${allMatches.length} matchs) sont mappés dans lib/flags.ts`)
  } else {
    console.log(`   ⚠️  ${unknown.size} équipe(s) absentes de lib/flags.ts :`)
    for (const name of Array.from(unknown).sort()) {
      console.log(`      - "${name}"`)
    }
    console.log('\n   → Ajouter dans FLAGS et TEAM_NAME_FR, puis relancer.')
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📋 Update équipes playoffs + phases — CdM 2026\n')

  console.log('── Phase 0 : Résolution des Winners Playoff ─────────────────────')
  await resolvePlayoffs()

  console.log('\n── Phase 0.5 : Corrections de mapping ───────────────────────────')
  await correctMappings()

  console.log('\n── Phase 1 : Renommage des stages ───────────────────────────────')
  await renameStages()

  console.log('\n── Phase 2 : Vérification couverture drapeaux ───────────────────')
  await verifyFlags()

  console.log('\n✅ Script terminé. Lancer ensuite :')
  console.log('   npx tsx scripts/map-match-ids.ts')
}

main().catch((err) => {
  console.error('❌ Erreur inattendue :', err)
  process.exit(1)
})
