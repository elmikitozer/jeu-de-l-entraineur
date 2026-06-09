/**
 * seed-players.ts — Import des 50 joueurs notables de la CdM 2026.
 *
 * Ces joueurs servent de données de test pour l'interface admin.
 * Les vrais joueurs sélectionnés seront ajoutés/mis à jour via l'interface admin
 * ou lors de la sync API-Football (Session 6).
 *
 * Idempotent : vérifie l'existence par (name, nationality_code) avant d'insérer.
 *
 * Lancement :
 *   npx tsx scripts/seed-players.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variables manquantes : NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

// ---------------------------------------------------------------------------
// Données — 50 joueurs notables, max 3 par nationalité dans les équipes
// ---------------------------------------------------------------------------

const PLAYERS = [
  // ── GK ────────────────────────────────────────────────────────────────────
  { name: 'Emiliano Martínez',   nationality: 'Argentina',    nationality_code: 'AR', position: 'GK' },
  { name: 'Thibaut Courtois',    nationality: 'Belgium',      nationality_code: 'BE', position: 'GK' },
  { name: 'Alisson Becker',      nationality: 'Brazil',       nationality_code: 'BR', position: 'GK' },
  { name: 'Jordan Pickford',     nationality: 'England',      nationality_code: 'EN', position: 'GK' },
  { name: 'Gianluigi Donnarumma',nationality: 'Italy',        nationality_code: 'IT', position: 'GK' },
  { name: 'Yassine Bounou',      nationality: 'Morocco',      nationality_code: 'MA', position: 'GK' },
  { name: 'Mike Maignan',        nationality: 'France',       nationality_code: 'FR', position: 'GK' },
  { name: 'Manuel Neuer',        nationality: 'Germany',      nationality_code: 'DE', position: 'GK' },

  // ── DEF ───────────────────────────────────────────────────────────────────
  { name: 'Lisandro Martínez',   nationality: 'Argentina',    nationality_code: 'AR', position: 'DEF' },
  { name: 'Marquinhos',          nationality: 'Brazil',       nationality_code: 'BR', position: 'DEF' },
  { name: 'Virgil van Dijk',     nationality: 'Netherlands',  nationality_code: 'NL', position: 'DEF' },
  { name: 'Rúben Dias',          nationality: 'Portugal',     nationality_code: 'PT', position: 'DEF' },
  { name: 'William Saliba',      nationality: 'France',       nationality_code: 'FR', position: 'DEF' },
  { name: 'Alessandro Bastoni',  nationality: 'Italy',        nationality_code: 'IT', position: 'DEF' },
  { name: 'Achraf Hakimi',       nationality: 'Morocco',      nationality_code: 'MA', position: 'DEF' },
  { name: 'Kyle Walker',         nationality: 'England',      nationality_code: 'EN', position: 'DEF' },
  { name: 'Josko Gvardiol',      nationality: 'Croatia',      nationality_code: 'HR', position: 'DEF' },
  { name: 'João Cancelo',        nationality: 'Portugal',     nationality_code: 'PT', position: 'DEF' },
  { name: 'Ronald Araújo',       nationality: 'Uruguay',      nationality_code: 'UY', position: 'DEF' },
  { name: 'Jonathan Tah',        nationality: 'Germany',      nationality_code: 'DE', position: 'DEF' },

  // ── MID ───────────────────────────────────────────────────────────────────
  { name: 'Kevin De Bruyne',     nationality: 'Belgium',      nationality_code: 'BE', position: 'MID' },
  { name: 'Pedri',               nationality: 'Spain',        nationality_code: 'ES', position: 'MID' },
  { name: 'Jude Bellingham',     nationality: 'England',      nationality_code: 'EN', position: 'MID' },
  { name: 'Frenkie de Jong',     nationality: 'Netherlands',  nationality_code: 'NL', position: 'MID' },
  { name: 'Federico Valverde',   nationality: 'Uruguay',      nationality_code: 'UY', position: 'MID' },
  { name: 'Casemiro',            nationality: 'Brazil',       nationality_code: 'BR', position: 'MID' },
  { name: 'Jamal Musiala',       nationality: 'Germany',      nationality_code: 'DE', position: 'MID' },
  { name: 'Sofyan Amrabat',      nationality: 'Morocco',      nationality_code: 'MA', position: 'MID' },
  { name: 'Enzo Fernández',      nationality: 'Argentina',    nationality_code: 'AR', position: 'MID' },
  { name: 'Vitinha',             nationality: 'Portugal',     nationality_code: 'PT', position: 'MID' },
  { name: 'Aurélien Tchouaméni', nationality: 'France',       nationality_code: 'FR', position: 'MID' },
  { name: 'Rodri',               nationality: 'Spain',        nationality_code: 'ES', position: 'MID' },
  { name: 'Luka Modrić',         nationality: 'Croatia',      nationality_code: 'HR', position: 'MID' },

  // ── FWD ───────────────────────────────────────────────────────────────────
  { name: 'Kylian Mbappé',       nationality: 'France',       nationality_code: 'FR', position: 'FWD' },
  { name: 'Lionel Messi',        nationality: 'Argentina',    nationality_code: 'AR', position: 'FWD' },
  { name: 'Vinícius Júnior',     nationality: 'Brazil',       nationality_code: 'BR', position: 'FWD' },
  { name: 'Cristiano Ronaldo',   nationality: 'Portugal',     nationality_code: 'PT', position: 'FWD' },
  { name: 'Bukayo Saka',         nationality: 'England',      nationality_code: 'EN', position: 'FWD' },
  { name: 'Harry Kane',          nationality: 'England',      nationality_code: 'EN', position: 'FWD' },
  { name: 'Lautaro Martínez',    nationality: 'Argentina',    nationality_code: 'AR', position: 'FWD' },
  { name: 'Leroy Sané',          nationality: 'Germany',      nationality_code: 'DE', position: 'FWD' },
  { name: 'Florian Wirtz',       nationality: 'Germany',      nationality_code: 'DE', position: 'FWD' },
  { name: 'Lamine Yamal',        nationality: 'Spain',        nationality_code: 'ES', position: 'FWD' },
  { name: 'Antoine Griezmann',   nationality: 'France',       nationality_code: 'FR', position: 'FWD' },
  { name: 'Sadio Mané',          nationality: 'Senegal',      nationality_code: 'SN', position: 'FWD' },
  { name: 'Richarlison',         nationality: 'Brazil',       nationality_code: 'BR', position: 'FWD' },
  { name: 'Memphis Depay',       nationality: 'Netherlands',  nationality_code: 'NL', position: 'FWD' },
  { name: 'Ivan Perišić',        nationality: 'Croatia',      nationality_code: 'HR', position: 'FWD' },
  { name: 'Ferran Torres',       nationality: 'Spain',        nationality_code: 'ES', position: 'FWD' },
  { name: 'Luis Díaz',           nationality: 'Colombia',     nationality_code: 'CO', position: 'FWD' },
] as const

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`🔍 Vérification des joueurs existants...`)

  const { data: existing, error: fetchError } = await supabase
    .from('players')
    .select('name, nationality_code')

  if (fetchError) {
    console.error('❌ Erreur lecture Supabase :', fetchError.message)
    process.exit(1)
  }

  const existingKeys = new Set(
    (existing ?? []).map((p) => `${p.name}|${p.nationality_code}`)
  )

  const toInsert = PLAYERS.filter(
    (p) => !existingKeys.has(`${p.name}|${p.nationality_code}`)
  )

  const skipped = PLAYERS.length - toInsert.length

  if (toInsert.length === 0) {
    console.log(`✅ Tous les ${PLAYERS.length} joueurs sont déjà en base. Rien à faire.`)
    return
  }

  console.log(`   ${skipped} déjà en base, ${toInsert.length} à insérer`)
  console.log(`\n🔄 Insertion de ${toInsert.length} joueurs...`)

  const { error } = await supabase.from('players').insert(
    toInsert.map((p) => ({
      name: p.name,
      nationality: p.nationality,
      nationality_code: p.nationality_code,
      position: p.position,
      photo_url: null,
      api_football_id: null,
    }))
  )

  if (error) {
    console.error('❌ Erreur insertion :', error.message)
    process.exit(1)
  }

  // Résumé par position
  const byPosition = toInsert.reduce<Record<string, number>>(
    (acc, p) => ({ ...acc, [p.position]: (acc[p.position] ?? 0) + 1 }),
    {}
  )

  console.log('\n✅ Seed joueurs terminé !')
  console.log(`   ✅ ${toInsert.length} joueurs insérés`)
  if (skipped > 0) console.log(`   ⏭️  ${skipped} joueurs ignorés (déjà en base)`)
  console.log(`\n📊 Par position :`)
  for (const [pos, count] of Object.entries(byPosition)) {
    console.log(`   ${pos}: ${count}`)
  }

  // Pays représentés
  const countries = Array.from(new Set(toInsert.map((p) => p.nationality))).sort()
  console.log(`\n🌍 ${countries.length} nationalités : ${countries.join(', ')}`)
}

main().catch((err) => {
  console.error('❌ Erreur inattendue :', err)
  process.exit(1)
})
