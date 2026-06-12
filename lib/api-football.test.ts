import { describe, it, expect } from 'vitest'
import { resolveTeamResults } from './api-football'

const HOME = 10
const AWAY = 20

describe('resolveTeamResults', () => {
  it('victoire à domicile (winner flag) → win/loss', () => {
    const r = resolveTeamResults(HOME, AWAY, true, false, 2, 1)
    expect(r[HOME]).toBe('win')
    expect(r[AWAY]).toBe('loss')
  })

  it('victoire extérieur (winner flag) → loss/win', () => {
    const r = resolveTeamResults(HOME, AWAY, false, true, 0, 1)
    expect(r[HOME]).toBe('loss')
    expect(r[AWAY]).toBe('win')
  })

  it('match en cours (winner null) → résultat déduit du score', () => {
    const r = resolveTeamResults(HOME, AWAY, null, null, 3, 0)
    expect(r[HOME]).toBe('win')
    expect(r[AWAY]).toBe('loss')
  })

  it('score égal sans winner → nul pour les deux', () => {
    const r = resolveTeamResults(HOME, AWAY, null, null, 1, 1)
    expect(r[HOME]).toBe('draw')
    expect(r[AWAY]).toBe('draw')
  })

  it('TAB (decidedByShootout) → NUL pour les deux, même si l’API désigne un vainqueur', () => {
    // Score réglementaire/prolongation 1-1, qualifié = home (winner=true).
    // Convention FIFA : le match reste un nul pour le résultat collectif.
    const r = resolveTeamResults(HOME, AWAY, true, false, 1, 1, true)
    expect(r[HOME]).toBe('draw')
    expect(r[AWAY]).toBe('draw')
  })

  it('AET sans shootout → victoire normale (decidedByShootout=false)', () => {
    // Victoire après prolongation : winner=true, pas de TAB → reste une victoire.
    const r = resolveTeamResults(HOME, AWAY, false, true, 1, 2, false)
    expect(r[HOME]).toBe('loss')
    expect(r[AWAY]).toBe('win')
  })
})
