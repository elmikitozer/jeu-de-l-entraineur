/**
 * dedup-players.ts — Supprime les doublons de joueurs insérés manuellement.
 *
 * Joueurs avec api_football_id=null :
 *   - Si référencé dans teams → trouver le doublon API, rerouter teams vers lui, supprimer l'ancien
 *   - Si orphelin (pas dans teams) → supprimer directement
 *
 * Dry-run par défaut. Passer --apply pour exécuter.
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const APPLY = process.argv.includes('--apply')
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function lastName(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts[parts.length - 1].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

async function main() {
  console.log(APPLY ? '🔴 MODE APPLY — modifications réelles' : '🟡 DRY-RUN — aucune modification')
  console.log()

  // 1. Récupérer tous les joueurs
  const { data: allPlayers, error: e1 } = await supabase
    .from('players')
    .select('id, name, nationality, position, api_football_id, photo_url')

  if (e1 || !allPlayers) { console.error('❌ fetch players:', e1?.message); process.exit(1) }

  const nullPlayers  = allPlayers.filter(p => p.api_football_id === null)
  const apiPlayers   = allPlayers.filter(p => p.api_football_id !== null)

  // Index API players par (nationality + lastName)
  const apiIndex = new Map<string, typeof apiPlayers[0][]>()
  for (const p of apiPlayers) {
    const key = `${p.nationality}|${lastName(p.name)}`
    if (!apiIndex.has(key)) apiIndex.set(key, [])
    apiIndex.get(key)!.push(p)
  }

  // 2. Récupérer les player_id utilisés dans teams
  const { data: teamRows } = await supabase.from('teams').select('id, player_id')
  const teamsByPlayer = new Map<string, string[]>() // player_id → [team.id]
  for (const row of teamRows ?? []) {
    if (!teamsByPlayer.has(row.player_id)) teamsByPlayer.set(row.player_id, [])
    teamsByPlayer.get(row.player_id)!.push(row.id)
  }

  // 3. Traitement
  let matched = 0, orphansDeleted = 0, errors = 0

  for (const p of nullPlayers) {
    const key = `${p.nationality}|${lastName(p.name)}`
    const candidates = apiIndex.get(key) ?? []
    const teamIds = teamsByPlayer.get(p.id) ?? []
    const inTeam = teamIds.length > 0

    if (!inTeam) {
      // Orphelin — supprimer
      console.log(`🗑  Orphelin: "${p.name}" (${p.nationality})`)
      if (APPLY) {
        const { error } = await supabase.from('players').delete().eq('id', p.id)
        if (error) { console.error(`   ❌ delete failed: ${error.message}`); errors++ }
        else orphansDeleted++
      } else {
        orphansDeleted++
      }
      continue
    }

    // Utilisé dans une équipe — trouver le doublon API
    if (candidates.length === 0) {
      console.error(`❓ Aucun doublon API trouvé pour "${p.name}" (${p.nationality}) — IGNORÉ`)
      errors++
      continue
    }

    // Prendre le premier candidat (il ne devrait y en avoir qu'un par nom/nationalité)
    const apiPlayer = candidates[0]
    console.log(`🔄 "${p.name}" → "${apiPlayer.name}" (api_id=${apiPlayer.api_football_id})`)
    console.log(`   teams concernées: ${teamIds.length} | photo: ${apiPlayer.photo_url ? '✅' : '❌'}`)

    if (APPLY) {
      // Rerouter teams
      const { error: teamsErr } = await supabase
        .from('teams')
        .update({ player_id: apiPlayer.id })
        .eq('player_id', p.id)

      if (teamsErr) {
        console.error(`   ❌ update teams failed: ${teamsErr.message}`)
        errors++
        continue
      }

      // Supprimer l'ancien
      const { error: delErr } = await supabase.from('players').delete().eq('id', p.id)
      if (delErr) {
        console.error(`   ❌ delete failed: ${delErr.message}`)
        errors++
      } else {
        matched++
      }
    } else {
      matched++
    }
  }

  console.log()
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`🔄 ${matched} joueurs reroutés (teams → doublon API)`)
  console.log(`🗑  ${orphansDeleted} orphelins supprimés`)
  if (errors) console.log(`❌ ${errors} erreurs`)
  if (!APPLY) console.log('\n→ Relancer avec --apply pour appliquer les changements')
}

main().catch(err => { console.error('❌', err); process.exit(1) })
