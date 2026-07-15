import { describe, it, expect } from 'vitest'
import { bestNameMatch, cleanFifaLine, fifaMatchNumber, matchEntryToFixture, normalizeName, type FifaMotmEntry } from './fifa-motm'

describe('fifaMatchNumber', () => {
  it('extrait le numéro de match officiel des lignes de phase finale', () => {
    expect(fifaMatchNumber('Match 101 – Spain 2-1 Argentina - Lamine Yamal (Spain)')).toBe(101)
    expect(fifaMatchNumber('Match 74 – Germany 1-1 Paraguay (PSO 3-4) - Orlando Gill (Paraguay)')).toBe(74)
  })

  it('retourne null en phase de groupes (pas de numéro dans le flux)', () => {
    expect(fifaMatchNumber('Mexico 2-0 South Africa - Julian Quinones (Mexico)')).toBeNull()
  })
})

describe('cleanFifaLine (format phase finale)', () => {
  it('retire le préfixe "Match N –"', () => {
    expect(cleanFifaLine('Match 73 – South Africa 0-1 Canada - Stephen Eustaquio (Canada)'))
      .toBe('South Africa 0-1 Canada - Stephen Eustaquio (Canada)')
  })

  it('retire le score de TAB "(PSO x-y)" mais garde le score réglementaire et la nationalité', () => {
    expect(cleanFifaLine('Match 74 – Germany 1-1 Paraguay (PSO 3-4)  - Orlando Gill (Paraguay)'))
      .toBe('Germany 1-1 Paraguay - Orlando Gill (Paraguay)')
  })

  it('préserve une espace autour du tiret de score ("1 -1")', () => {
    expect(cleanFifaLine('Match 75 – Netherlands 1 -1 Morocco (PSO 2-3) - Issa Diop (Morocco)'))
      .toBe('Netherlands 1 -1 Morocco - Issa Diop (Morocco)')
  })

  it('no-op sur une ligne de phase de groupes', () => {
    expect(cleanFifaLine('Mexico 2-0 South Africa - Julian Quinones (Mexico)'))
      .toBe('Mexico 2-0 South Africa - Julian Quinones (Mexico)')
  })
})

describe('normalizeName', () => {
  it('retire accents, casse et ponctuation', () => {
    expect(normalizeName('Vinícius Júnior')).toBe('vinicius junior')
    expect(normalizeName("J. McGinn")).toBe('j mcginn')
    expect(normalizeName('Hwang In-Beom')).toBe('hwang in beom')
  })
})

describe('bestNameMatch', () => {
  const id = (name: string) => ({ id: name, name })

  it('matche exactement aux accents près (FIFA retire les accents)', () => {
    expect(bestNameMatch('Julian Quinones', [id('J. Quiñones'), id('Hirving Lozano')])).toBe('J. Quiñones')
  })

  it('matche les noms composés malgré une coupure différente (régression Hwang)', () => {
    // FIFA "Hwang Inbeom" vs base "Hwang In-Beom"
    expect(bestNameMatch('Hwang Inbeom', [id('Hwang In-Beom'), id('Son Heung-Min')])).toBe('Hwang In-Beom')
  })

  it('gère le suffixe Jr / Junior', () => {
    expect(bestNameMatch('Vinicius Jr', [id('Vinícius Júnior')])).toBe('Vinícius Júnior')
  })

  it('matche un prénom abrégé en base', () => {
    expect(bestNameMatch('John McGinn', [id('J.  McGinn'), id('Scott McTominay')])).toBe('J.  McGinn')
  })

  it('retourne null si aucun candidat fiable', () => {
    expect(bestNameMatch('Lionel Messi', [id('Cristiano Ronaldo'), id('Kylian Mbappe')])).toBeNull()
  })
})

describe('matchEntryToFixture', () => {
  const entries: FifaMotmEntry[] = [
    { matchNumber: null, home: 'Korea Republic', away: 'Czechia', homeScore: 2, awayScore: 1, player: 'Hwang Inbeom', nationality: 'Korea Republic' },
    { matchNumber: null, home: 'Mexico', away: 'South Africa', homeScore: 2, awayScore: 0, player: 'Julian Quinones', nationality: 'Mexico' },
  ]

  it('résout les alias de nom via getCountryCode (South Korea↔Korea Republic, Czech Republic↔Czechia)', () => {
    const e = matchEntryToFixture(entries, 'South Korea', 'Czech Republic', 2, 1)
    expect(e?.player).toBe('Hwang Inbeom')
  })

  it('exige un score identique', () => {
    expect(matchEntryToFixture(entries, 'Mexico', 'South Africa', 1, 0)).toBeNull()
  })

  it("retourne null pour une équipe inconnue de flags.ts", () => {
    expect(matchEntryToFixture(entries, 'Atlantis', 'South Africa', 2, 0)).toBeNull()
  })
})
