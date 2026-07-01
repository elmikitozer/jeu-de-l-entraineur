/**
 * fifa-motm.ts — Récupère le « Player of the Match » OFFICIEL FIFA.
 *
 * Source : l'API interne FIFA+ (cxm-api.fifa.com), exposée par le shell de
 * www.fifa.com via `SERVICE_API_URL`. La page est rendue côté client, mais la
 * donnée elle-même est servie en Contentful Rich Text (AST JSON structuré) —
 * donc PAS de scraping DOM ni de navigateur headless : un simple fetch suffit.
 *
 *   GET /pages/articles/{slug}      → métadonnées + entryEndpoint de la section
 *   GET /sections/article/{id}      → corps richtext (liste des MOTM par match)
 *
 * Format d'une ligne jouée (vérifié sur données réelles, CdM 2026) :
 *   Phase de groupes : "Mexico 2-0 South Africa - Julian Quinones (Mexico)"
 *   Phase finale     : "Match 73 – South Africa 0-1 Canada - Stephen Eustaquio (Canada)"
 *                      "Match 74 – Germany 1-1 Paraguay (PSO 3-4) - Orlando Gill (Paraguay)"
 *   ⚠️ noms d'équipe COMPLETS (pas de codes 3 lettres), séparateur '-' OU '–',
 *      accents retirés côté FIFA. La phase finale ajoute un préfixe "Match N –",
 *      un score de TAB "(PSO x-y)" (⇒ score RÉGLEMENTAIRE conservé pour le
 *      matching, un nul) et parfois une espace autour du tiret du score ("1 -1").
 *      cleanFifaLine() neutralise ces trois écarts. Les matchs non joués sont au
 *      format "Team v Team – Stadium" et sont ignorés.
 *
 * Le matching équipe/nationalité réutilise getCountryCode() de flags.ts
 * (source unique, déjà alignée sur tous les alias FIFA : Czechia, Korea
 * Republic, Türkiye, Cabo Verde, IR Iran…) plutôt qu'une table d'alias dédiée.
 */

import { getCountryCode } from './flags'

const FIFA_API = 'https://cxm-api.fifa.com/fifaplusweb/api'
const ARTICLE_SLUG = 'michelob-ultra-superior-player-of-match-winner'

export interface FifaMotmEntry {
  home: string
  away: string
  homeScore: number
  awayScore: number
  player: string // nom tel qu'affiché par FIFA (accents retirés)
  nationality: string // contenu des parenthèses
}

// ── Client HTTP ────────────────────────────────────────────────────────────

async function fifaFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${FIFA_API}${path}`, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`FIFA API ${path} → HTTP ${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

// ── Parsing du Rich Text ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RichNode = { nodeType?: string; value?: string; content?: any[] }

/** Concatène récursivement les nœuds texte d'un nœud Rich Text. */
function textOf(node: RichNode): string {
  if (node?.nodeType === 'text') return node.value ?? ''
  return (node?.content ?? []).map(textOf).join('')
}

// "Home X-Y rest" → 1:home (non-greedy) 2:hs 3:as 4:rest. Le tiret du score
// tolère une espace de part et d'autre ("Netherlands 1 -1 Morocco").
const LINE = /^(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+)$/
// "Away [-–] Player (Nationality)" → 1:away 2:player 3:nat (ancré sur les parenthèses finales)
const TAIL = /^(.+?)\s*[-–]\s*(.+?)\s*\(([^()]+)\)\s*$/

/**
 * Neutralise les écarts de format de la phase finale avant parsing :
 *   - préfixe "Match N –" (ou "Match N -") placé avant l'équipe domicile,
 *   - parenthèse de score TAB "(PSO 3-4)" ou mention "(AET)" — toute parenthèse
 *     contenant un chiffre — insérée entre l'équipe extérieure et le joueur.
 * Le score réglementaire (hors TAB) reste intact pour le matching, la nationalité
 * finale "(Canada)" (sans chiffre) est préservée. No-op sur les lignes de groupe.
 */
export function cleanFifaLine(line: string): string {
  return line
    .replace(/^Match\s+\d+\s*[–-]\s*/i, '')
    .replace(/\([^()]*\d[^()]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseRichText(rt: RichNode): FifaMotmEntry[] {
  const paras: string[] = []
  const walk = (n: RichNode) => {
    if (n?.nodeType === 'paragraph') {
      const t = textOf(n)
      if (t.trim()) paras.push(t)
    } else (n?.content ?? []).forEach(walk)
  }
  walk(rt)

  const entries: FifaMotmEntry[] = []
  for (const p of paras) {
    for (const rawLine of p.split('\n')) {
      const line = cleanFifaLine(rawLine)
      const m = LINE.exec(line)
      if (!m) continue
      const t = TAIL.exec(m[4])
      if (!t) continue // "Team v Team – Group X" (pas encore joué) → ignoré
      entries.push({
        home: m[1].trim(),
        away: t[1].trim(),
        homeScore: Number(m[2]),
        awayScore: Number(m[3]),
        player: t[2].trim(),
        nationality: t[3].trim(),
      })
    }
  }
  return entries
}

// ── API publique ────────────────────────────────────────────────────────────

// Mémo process-local : le sync peut traiter plusieurs matchs dans un même tick.
let cache: { at: number; entries: FifaMotmEntry[] } | null = null
const TTL_MS = 60_000

/**
 * Liste de tous les MOTM officiels publiés. Throw si l'API échoue
 * (l'appelant gère le fallback proxy). Mémoïsé 60 s.
 */
export async function fetchFifaMotm(): Promise<FifaMotmEntry[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.entries

  const page = await fifaFetch<{ sections?: Array<{ entryEndpoint?: string }> }>(
    `/pages/articles/${ARTICLE_SLUG}`,
  )
  const endpoint = page.sections?.[0]?.entryEndpoint // ex: /sections/article/<id>?locale=en
  if (!endpoint) throw new Error('FIFA MOTM : section introuvable dans la page')

  const section = await fifaFetch<{ richtext?: RichNode }>(endpoint)
  if (!section.richtext) throw new Error('FIFA MOTM : richtext absent de la section')

  const entries = parseRichText(section.richtext)
  cache = { at: Date.now(), entries }
  return entries
}

// ── Matching ────────────────────────────────────────────────────────────────

/**
 * Trouve l'entrée FIFA correspondant à un match donné, par code pays (réutilise
 * getCountryCode pour absorber tous les écarts de nommage) ET score. Retourne
 * null si l'entrée n'existe pas encore (MOTM pas publié) ou si les équipes ne
 * résolvent pas en code pays.
 */
export function matchEntryToFixture(
  entries: FifaMotmEntry[],
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
): FifaMotmEntry | null {
  const homeCode = getCountryCode(homeTeam)
  const awayCode = getCountryCode(awayTeam)
  if (!homeCode || !awayCode) return null

  return (
    entries.find(
      (e) =>
        e.homeScore === homeScore &&
        e.awayScore === awayScore &&
        getCountryCode(e.home) === homeCode &&
        getCountryCode(e.away) === awayCode,
    ) ?? null
  )
}

/** Normalise un nom pour le matching : sans accents, minuscules, sans ponctuation. */
export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.''-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Score de similarité [0..1] entre un nom FIFA et un nom de notre base.
 * Pensé pour un petit ensemble de candidats déjà filtré par nationalité.
 * Gère les abréviations courantes (jr/junior) et l'ordre des tokens.
 */
function nameScore(target: string, candidate: string): number {
  const a = normalizeName(target)
  const b = normalizeName(candidate)
  if (a === b) return 1
  // Égalité « sans espaces » : absorbe les coupures variables des noms composés
  // (FIFA "Hwang Inbeom" vs base "Hwang In-Beom" → "hwanginbeom" == "hwanginbeom").
  if (a.replace(/ /g, '') === b.replace(/ /g, '')) return 0.95
  if (a.includes(b) || b.includes(a)) return 0.85

  // Abréviation jr ↔ junior pour ne pas pénaliser "Vinicius Jr" vs "Vinicius Junior".
  const tokens = (s: string) =>
    s.split(' ').filter(Boolean).map((t) => (t === 'junior' ? 'jr' : t))
  const ta = tokens(a)
  const tb = tokens(b)
  const tbSet = new Set(tb)

  const inter = ta.filter((t) => tbSet.has(t))
  if (inter.length === 0) return 0
  const surnameMatch = ta[ta.length - 1] === tb[tb.length - 1] ? 0.2 : 0
  return Math.min(1, inter.length / Math.min(ta.length, tb.length) + surnameMatch)
}

export interface NameCandidate {
  id: string
  name: string
}

/**
 * Meilleur match de nom parmi des candidats (déjà restreints par nationalité +
 * présence au match). Retourne l'id ou null si rien d'assez sûr (seuil 0.6).
 */
export function bestNameMatch(target: string, candidates: NameCandidate[]): string | null {
  let best: { id: string; score: number } | null = null
  for (const c of candidates) {
    const score = nameScore(target, c.name)
    if (!best || score > best.score) best = { id: c.id, score }
  }
  return best && best.score >= 0.6 ? best.id : null
}
