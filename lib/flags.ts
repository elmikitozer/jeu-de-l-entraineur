/**
 * flags.ts — Mapping nom d'équipe → code ISO 3166-1 alpha-2 (minuscules)
 * Couvre les 48 nations de la CdM 2026, noms anglais ET français.
 * Usage : getFlagUrl("France") → "https://flagcdn.com/24x18/fr.png"
 */

const FLAGS: Record<string, string> = {
  // ── CONCACAF ──────────────────────────────────────────────────────────
  'United States':       'us',
  'USA':                 'us',
  'États-Unis':          'us',
  'Canada':              'ca',
  'Mexico':              'mx',
  'Mexique':             'mx',
  'Costa Rica':          'cr',
  'Honduras':            'hn',
  'Panama':              'pa',
  'Jamaica':             'jm',
  'Jamaïque':            'jm',

  // ── CONMEBOL ─────────────────────────────────────────────────────────
  'Argentina':           'ar',
  'Argentine':           'ar',
  'Brazil':              'br',
  'Brésil':              'br',
  'Colombia':            'co',
  'Colombie':            'co',
  'Ecuador':             'ec',
  'Équateur':            'ec',
  'Uruguay':             'uy',
  'Venezuela':           've',
  'Paraguay':            'py',
  'Chile':               'cl',
  'Chili':               'cl',
  'Peru':                'pe',
  'Pérou':               'pe',
  'Bolivia':             'bo',

  // ── UEFA ─────────────────────────────────────────────────────────────
  'France':              'fr',
  'Germany':             'de',
  'Allemagne':           'de',
  'Spain':               'es',
  'Espagne':             'es',
  'England':             'gb-eng',
  'Angleterre':          'gb-eng',
  'Netherlands':         'nl',
  'Pays-Bas':            'nl',
  'Portugal':            'pt',
  'Belgium':             'be',
  'Belgique':            'be',
  'Croatia':             'hr',
  'Croatie':             'hr',
  'Italy':               'it',
  'Italie':              'it',
  'Serbia':              'rs',
  'Serbie':              'rs',
  'Switzerland':         'ch',
  'Suisse':              'ch',
  'Denmark':             'dk',
  'Danemark':            'dk',
  'Norway':              'no',
  'Norvège':             'no',
  'Poland':              'pl',
  'Pologne':             'pl',
  'Ukraine':             'ua',
  // Turquie — nom DB anglais avant script, nom français après
  'Turkey':              'tr',
  'Türkiye':             'tr',
  'Turquie':             'tr',
  // Suède — nom DB anglais avant script, nom français après
  'Sweden':              'se',
  'Suède':               'se',
  // Tchéquie — nom DB anglais avant script, nom français après
  'Czech Republic':      'cz',
  'Czechia':             'cz',
  'Tchéquie':            'cz',
  // Bosnie — nom DB anglais avant script, nom français après
  'Bosnia & Herzegovina': 'ba',
  'Bosnia and Herzegovina': 'ba',
  'Bosnia':              'ba',
  'Bosnie':              'ba',
  // Autres UEFA
  'Austria':             'at',
  'Autriche':            'at',
  'Hungary':             'hu',
  'Hongrie':             'hu',
  'Romania':             'ro',
  'Roumanie':            'ro',
  'Slovakia':            'sk',
  'Slovaquie':           'sk',
  'Albania':             'al',
  'Albanie':             'al',
  'Scotland':            'gb-sct',
  'Écosse':              'gb-sct',
  'Greece':              'gr',
  'Grèce':               'gr',
  'Iceland':             'is',
  'Islande':             'is',
  'Wales':               'gb-wls',
  'Pays de Galles':      'gb-wls',

  // ── CAF ──────────────────────────────────────────────────────────────
  'Morocco':             'ma',
  'Maroc':               'ma',
  'Senegal':             'sn',
  'Sénégal':             'sn',
  'Egypt':               'eg',
  'Égypte':              'eg',
  'Nigeria':             'ng',
  'Ivory Coast':         'ci',
  "Côte d'Ivoire":       'ci',
  'Cote d\'Ivoire':      'ci',
  'Cameroon':            'cm',
  'Cameroun':            'cm',
  'Tunisia':             'tn',
  'Tunisie':             'tn',
  'Algeria':             'dz',
  'Algérie':             'dz',
  'Ghana':               'gh',
  // Congo DR — nom DB anglais avant script, nom français après
  'Congo DR':            'cd',
  'DR Congo':            'cd',
  'Democratic Republic of Congo': 'cd',
  'RD Congo':            'cd',
  'South Africa':        'za',
  'Afrique du Sud':      'za',
  'Mali':                'ml',
  'Guinea':              'gn',
  'Guinée':              'gn',
  'Tanzania':            'tz',
  'Tanzanie':            'tz',
  'Zambia':              'zm',
  'Zambie':              'zm',

  // ── AFC ──────────────────────────────────────────────────────────────
  'Japan':               'jp',
  'Japon':               'jp',
  'South Korea':         'kr',
  'Korea Republic':      'kr',
  'Corée du Sud':        'kr',
  'Saudi Arabia':        'sa',
  'Arabie Saoudite':     'sa',
  'Iran':                'ir',
  'Australia':           'au',
  'Australie':           'au',
  'Qatar':               'qa',
  'Uzbekistan':          'uz',
  'Ouzbékistan':         'uz',
  'Jordan':              'jo',
  'Jordanie':            'jo',
  // Irak — nom DB anglais avant script, nom français après
  'Iraq':                'iq',
  'Irak':                'iq',
  'China':               'cn',
  'Chine':               'cn',
  'Oman':                'om',
  'United Arab Emirates': 'ae',
  'Émirats arabes unis': 'ae',
  'India':               'in',
  'Inde':                'in',
  'Indonesia':           'id',
  'Indonésie':           'id',

  // ── OFC ──────────────────────────────────────────────────────────────
  'New Zealand':         'nz',
  'Nouvelle-Zélande':    'nz',

  // ── Divers / CONCACAF étendu ──────────────────────────────────────────
  'Cape Verde Islands':  'cv',
  'Cape Verde':          'cv',
  'Cabo Verde':          'cv',
  'Curaçao':             'cw',
  'Haiti':               'ht',
  'Haïti':               'ht',
  // Variante API-Football pour l'Iran
  'IR Iran':             'ir',

  // ── Équipes TBD (résultat playoff inconnu) ───────────────────────────
  // Code vide = connu mais sans drapeau à afficher
  'TBD':                 '',
}

/** Retourne le code ISO alpha-2 pour un nom d'équipe, ou null si inconnu ou sans drapeau. */
export function getCountryCode(teamName: string): string | null {
  const code = FLAGS[teamName]
  if (code === undefined || code === '') return null
  return code
}

/** Retourne l'URL flagcdn.com pour un nom d'équipe, ou null si inconnu ou sans drapeau. */
export function getFlagUrl(teamName: string, size: '24x18' | '40x30' | '16x12' = '24x18'): string | null {
  const code = getCountryCode(teamName)
  if (!code) return null
  return `https://flagcdn.com/${size}/${code}.png`
}

/** Retourne true si le nom est explicitement référencé dans FLAGS (même sans drapeau comme TBD). */
export function isKnownTeam(teamName: string): boolean {
  return teamName in FLAGS
}

// ── Codes FIFA 3 lettres ──────────────────────────────────────────────────────
// Clés en anglais (noms DB). Usage : FIFA_CODE[team] ?? team.slice(0,3).toUpperCase()

export const FIFA_CODE: Record<string, string> = {
  // CONCACAF
  'United States':          'USA',
  'USA':                    'USA',
  'Canada':                 'CAN',
  'Mexico':                 'MEX',
  'Costa Rica':             'CRC',
  'Honduras':               'HON',
  'Panama':                 'PAN',
  'Jamaica':                'JAM',

  // CONMEBOL
  'Argentina':              'ARG',
  'Brazil':                 'BRA',
  'Colombia':               'COL',
  'Ecuador':                'ECU',
  'Uruguay':                'URU',
  'Venezuela':              'VEN',
  'Paraguay':               'PAR',
  'Chile':                  'CHI',
  'Peru':                   'PER',
  'Bolivia':                'BOL',

  // UEFA
  'France':                 'FRA',
  'Germany':                'GER',
  'Spain':                  'ESP',
  'England':                'ENG',
  'Netherlands':            'NED',
  'Portugal':               'POR',
  'Belgium':                'BEL',
  'Croatia':                'CRO',
  'Italy':                  'ITA',
  'Serbia':                 'SRB',
  'Switzerland':            'SUI',
  'Denmark':                'DEN',
  'Norway':                 'NOR',
  'Poland':                 'POL',
  'Ukraine':                'UKR',
  'Turkey':                 'TUR',
  'Türkiye':                'TUR',
  'Sweden':                 'SWE',
  'Czech Republic':         'CZE',
  'Czechia':                'CZE',
  'Bosnia & Herzegovina':   'BIH',
  'Bosnia and Herzegovina': 'BIH',
  'Austria':                'AUT',
  'Hungary':                'HUN',
  'Romania':                'ROU',
  'Slovakia':               'SVK',
  'Albania':                'ALB',
  'Scotland':               'SCO',
  'Greece':                 'GRE',
  'Iceland':                'ISL',
  'Wales':                  'WAL',

  // CAF
  'Morocco':                'MAR',
  'Senegal':                'SEN',
  'Egypt':                  'EGY',
  'Nigeria':                'NGA',
  'Ivory Coast':            'CIV',
  'Cameroon':               'CMR',
  'Tunisia':                'TUN',
  'Algeria':                'ALG',
  'Ghana':                  'GHA',
  'Congo DR':               'COD',
  'DR Congo':               'COD',
  'South Africa':           'RSA',
  'Mali':                   'MLI',
  'Guinea':                 'GUI',
  'Tanzania':               'TAN',
  'Cape Verde Islands':     'CPV',
  'Cape Verde':             'CPV',
  'Cabo Verde':             'CPV',
  'Curaçao':                'CUW',
  'Haiti':                  'HAI',
  'Zambia':                 'ZAM',

  // AFC
  'Japan':                  'JPN',
  'South Korea':            'KOR',
  'Korea Republic':         'KOR',
  'Saudi Arabia':           'KSA',
  'Iran':                   'IRN',
  'IR Iran':                'IRN',
  'Australia':              'AUS',
  'Qatar':                  'QAT',
  'Uzbekistan':             'UZB',
  'Jordan':                 'JOR',
  'Iraq':                   'IRQ',
  'China':                  'CHN',
  'Indonesia':              'IDN',
  'India':                  'IND',
  'Oman':                   'OMA',
  'United Arab Emirates':   'UAE',

  // OFC
  'New Zealand':            'NZL',
}

// ── Traductions FR ────────────────────────────────────────────────────────────
// Les noms en base restent en anglais — uniquement l'affichage change.
// Usage : TEAM_NAME_FR[team] ?? team

export const TEAM_NAME_FR: Record<string, string> = {
  // CONCACAF
  'USA':                    'États-Unis',
  'United States':          'États-Unis',
  'Mexico':                 'Mexique',
  'Canada':                 'Canada',
  'Costa Rica':             'Costa Rica',
  'Honduras':               'Honduras',
  'Panama':                 'Panama',
  'Jamaica':                'Jamaïque',

  // CONMEBOL
  'Argentina':              'Argentine',
  'Brazil':                 'Brésil',
  'Colombia':               'Colombie',
  'Ecuador':                'Équateur',
  'Uruguay':                'Uruguay',
  'Venezuela':              'Venezuela',
  'Paraguay':               'Paraguay',
  'Chile':                  'Chili',
  'Peru':                   'Pérou',
  'Bolivia':                'Bolivie',

  // UEFA
  'France':                 'France',
  'Germany':                'Allemagne',
  'Spain':                  'Espagne',
  'England':                'Angleterre',
  'Netherlands':            'Pays-Bas',
  'Portugal':               'Portugal',
  'Belgium':                'Belgique',
  'Croatia':                'Croatie',
  'Italy':                  'Italie',
  'Serbia':                 'Serbie',
  'Switzerland':            'Suisse',
  'Denmark':                'Danemark',
  'Norway':                 'Norvège',
  'Poland':                 'Pologne',
  'Ukraine':                'Ukraine',
  'Turkey':                 'Turquie',
  'Türkiye':                'Turquie',
  'Sweden':                 'Suède',
  'Czech Republic':         'Tchéquie',
  'Czechia':                'Tchéquie',
  'Bosnia & Herzegovina':   'Bosnie-Herzégovine',
  'Bosnia and Herzegovina': 'Bosnie-Herzégovine',
  'Austria':                'Autriche',
  'Hungary':                'Hongrie',
  'Romania':                'Roumanie',
  'Slovakia':               'Slovaquie',
  'Albania':                'Albanie',
  'Scotland':               'Écosse',
  'Greece':                 'Grèce',
  'Iceland':                'Islande',
  'Wales':                  'Pays de Galles',

  // CAF
  'Morocco':                'Maroc',
  'Senegal':                'Sénégal',
  'Egypt':                  'Égypte',
  'Nigeria':                'Nigeria',
  'Ivory Coast':            "Côte d'Ivoire",
  'Cameroon':               'Cameroun',
  'Tunisia':                'Tunisie',
  'Algeria':                'Algérie',
  'Ghana':                  'Ghana',
  'Congo DR':               'RD Congo',
  'DR Congo':               'RD Congo',
  'South Africa':           'Afrique du Sud',
  'Mali':                   'Mali',
  'Guinea':                 'Guinée',
  'Tanzania':               'Tanzanie',
  'Cape Verde Islands':     'Cap-Vert',
  'Cape Verde':             'Cap-Vert',
  'Cabo Verde':             'Cap-Vert',
  'Curaçao':                'Curaçao',
  'Haiti':                  'Haïti',
  'Haïti':                  'Haïti',
  'IR Iran':                'Iran',

  // AFC
  'Japan':                  'Japon',
  'South Korea':            'Corée du Sud',
  'Korea Republic':         'Corée du Sud',
  'Saudi Arabia':           'Arabie Saoudite',
  'Iran':                   'Iran',
  'Australia':              'Australie',
  'Qatar':                  'Qatar',
  'Uzbekistan':             'Ouzbékistan',
  'Jordan':                 'Jordanie',
  'Iraq':                   'Irak',
  'China':                  'Chine',
  'Indonesia':              'Indonésie',
  'India':                  'Inde',
  'Oman':                   'Oman',
  'United Arab Emirates':   'Émirats arabes unis',

  // OFC
  'New Zealand':            'Nouvelle-Zélande',
}
