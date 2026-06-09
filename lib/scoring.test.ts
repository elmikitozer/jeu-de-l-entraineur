import { describe, it, expect } from 'vitest'
import { calculatePlayerPoints, formatBreakdown } from './scoring'
import type { PlayerStats } from './types'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeStats(overrides: Partial<PlayerStats>): PlayerStats {
  return {
    id: 'test-id',
    player_id: 'player-id',
    match_id: 'match-id',
    played: true,
    result: null,
    goals: 0,
    assists: 0,
    motm: false,
    yellow_cards: 0,
    red_cards: 0,
    penalty_saved: 0,
    penalty_scored: 0,
    freekick_goal: 0,
    cleansheet: false,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Résultat collectif
// ---------------------------------------------------------------------------

describe('résultat collectif', () => {
  it('victoire → +3 pts', () => {
    const result = calculatePlayerPoints(makeStats({ result: 'win' }), 'MID')
    expect(result.win_bonus).toBe(3)
    expect(result.draw_bonus).toBe(0)
    expect(result.total).toBe(3)
  })

  it('nul → +1 pt', () => {
    const result = calculatePlayerPoints(makeStats({ result: 'draw' }), 'MID')
    expect(result.draw_bonus).toBe(1)
    expect(result.win_bonus).toBe(0)
    expect(result.total).toBe(1)
  })

  it('défaite → 0 pt', () => {
    const result = calculatePlayerPoints(makeStats({ result: 'loss' }), 'MID')
    expect(result.win_bonus).toBe(0)
    expect(result.draw_bonus).toBe(0)
    expect(result.total).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Buts — gardien
// ---------------------------------------------------------------------------

describe('buts gardien (GK)', () => {
  it('but normal → +25 pts', () => {
    const result = calculatePlayerPoints(
      makeStats({ result: 'win', goals: 1 }),
      'GK',
    )
    expect(result.goal_position_bonus).toBe(25)
    expect(result.goal_freekick_bonus).toBe(0)
    expect(result.goal_penalty_bonus).toBe(0)
    expect(result.total).toBe(28) // +3 victoire +25 but
  })

  it('but sur coup franc → +25 (position) + 15 (coup franc) = +40 pts', () => {
    const result = calculatePlayerPoints(
      makeStats({ goals: 1, freekick_goal: 1 }),
      'GK',
    )
    expect(result.goal_position_bonus).toBe(25)
    expect(result.goal_freekick_bonus).toBe(15)
    expect(result.goal_penalty_bonus).toBe(0)
    expect(result.total).toBe(40)
  })

  it('but sur penalty → +5 flat (pas de bonus position)', () => {
    const result = calculatePlayerPoints(
      makeStats({ goals: 1, penalty_scored: 1 }),
      'GK',
    )
    expect(result.goal_position_bonus).toBe(0)
    expect(result.goal_freekick_bonus).toBe(0)
    expect(result.goal_penalty_bonus).toBe(5)
    expect(result.total).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// Buts — autres positions
// ---------------------------------------------------------------------------

describe('buts défenseur (DEF)', () => {
  it('but normal → +15 pts', () => {
    const result = calculatePlayerPoints(makeStats({ goals: 1 }), 'DEF')
    expect(result.goal_position_bonus).toBe(15)
    expect(result.total).toBe(15)
  })

  it('but coup franc → cumulatif : +15 (position) + 15 (coup franc) = +30 pts', () => {
    const result = calculatePlayerPoints(
      makeStats({ goals: 1, freekick_goal: 1 }),
      'DEF',
    )
    expect(result.goal_position_bonus).toBe(15)
    expect(result.goal_freekick_bonus).toBe(15)
    expect(result.total).toBe(30)
  })
})

describe('buts milieu (MID)', () => {
  it('but normal → +10 pts', () => {
    const result = calculatePlayerPoints(makeStats({ goals: 1 }), 'MID')
    expect(result.goal_position_bonus).toBe(10)
    expect(result.total).toBe(10)
  })
})

describe('buts attaquant (FWD)', () => {
  it('but normal → +5 pts', () => {
    const result = calculatePlayerPoints(makeStats({ goals: 1 }), 'FWD')
    expect(result.goal_position_bonus).toBe(5)
    expect(result.total).toBe(5)
  })

  it('but sur penalty hors TAB → +5 flat, pas de bonus position', () => {
    const result = calculatePlayerPoints(
      makeStats({ goals: 1, penalty_scored: 1 }),
      'FWD',
    )
    expect(result.goal_position_bonus).toBe(0)
    expect(result.goal_penalty_bonus).toBe(5)
    expect(result.total).toBe(5)
  })

  it('doublé attaquant (2 buts normaux) → +10 pts', () => {
    const result = calculatePlayerPoints(makeStats({ goals: 2 }), 'FWD')
    expect(result.goal_position_bonus).toBe(10)
    expect(result.total).toBe(10)
  })

  it('doublé mixte : 1 but normal + 1 coup franc → 5 + (5+15) = 25 pts', () => {
    const result = calculatePlayerPoints(
      makeStats({ goals: 2, freekick_goal: 1 }),
      'FWD',
    )
    // 2 buts obtiennent le bonus position (normal + coup franc) = 2 × 5 = 10
    // 1 coup franc = +15
    expect(result.goal_position_bonus).toBe(10)
    expect(result.goal_freekick_bonus).toBe(15)
    expect(result.total).toBe(25)
  })
})

// ---------------------------------------------------------------------------
// Autres performances
// ---------------------------------------------------------------------------

describe('passe décisive', () => {
  it('+3 pts par passe décisive', () => {
    const result = calculatePlayerPoints(makeStats({ assists: 1 }), 'MID')
    expect(result.assist_bonus).toBe(3)
    expect(result.total).toBe(3)
  })

  it('2 passes décisives → +6 pts', () => {
    const result = calculatePlayerPoints(makeStats({ assists: 2 }), 'MID')
    expect(result.assist_bonus).toBe(6)
    expect(result.total).toBe(6)
  })
})

describe('homme du match', () => {
  it('+3 pts', () => {
    const result = calculatePlayerPoints(makeStats({ motm: true }), 'FWD')
    expect(result.motm_bonus).toBe(3)
    expect(result.total).toBe(3)
  })
})

describe('cleansheet', () => {
  it('gardien cleansheet → +5 pts', () => {
    const result = calculatePlayerPoints(makeStats({ cleansheet: true }), 'GK')
    expect(result.cleansheet_bonus).toBe(5)
    expect(result.total).toBe(5)
  })

  it('défenseur cleansheet → 0 pt (bonus réservé au GK)', () => {
    const result = calculatePlayerPoints(makeStats({ cleansheet: true }), 'DEF')
    expect(result.cleansheet_bonus).toBe(0)
    expect(result.total).toBe(0)
  })
})

describe('penalty arrêté', () => {
  it('+5 pts par penalty arrêté', () => {
    const result = calculatePlayerPoints(makeStats({ penalty_saved: 1 }), 'GK')
    expect(result.penalty_saved_bonus).toBe(5)
    expect(result.total).toBe(5)
  })

  it('2 penalties arrêtés → +10 pts', () => {
    const result = calculatePlayerPoints(makeStats({ penalty_saved: 2 }), 'GK')
    expect(result.penalty_saved_bonus).toBe(10)
    expect(result.total).toBe(10)
  })
})

describe('carton rouge', () => {
  it('-10 pts', () => {
    const result = calculatePlayerPoints(makeStats({ red_cards: 1 }), 'MID')
    expect(result.red_card_malus).toBe(-10)
    expect(result.total).toBe(-10)
  })
})

// ---------------------------------------------------------------------------
// Combinaisons complexes
// ---------------------------------------------------------------------------

describe('combinaison complexe', () => {
  it('gardien : victoire + cleansheet + penalty arrêté + but normal = 38 pts', () => {
    const result = calculatePlayerPoints(
      makeStats({
        result: 'win',
        cleansheet: true,
        penalty_saved: 1,
        goals: 1,
      }),
      'GK',
    )
    // victoire +3, cleansheet +5, penalty arrêté +5, but GK +25 = 38
    expect(result.win_bonus).toBe(3)
    expect(result.cleansheet_bonus).toBe(5)
    expect(result.penalty_saved_bonus).toBe(5)
    expect(result.goal_position_bonus).toBe(25)
    expect(result.total).toBe(38)
  })

  it('milieu : nul + but coup franc + passe décisive + carton rouge', () => {
    const result = calculatePlayerPoints(
      makeStats({
        result: 'draw',
        goals: 1,
        freekick_goal: 1,
        assists: 1,
        red_cards: 1,
      }),
      'MID',
    )
    // nul +1, but normal MID +10, coup franc +15, passe +3, carton -10 = 19
    expect(result.draw_bonus).toBe(1)
    expect(result.goal_position_bonus).toBe(10)
    expect(result.goal_freekick_bonus).toBe(15)
    expect(result.assist_bonus).toBe(3)
    expect(result.red_card_malus).toBe(-10)
    expect(result.total).toBe(19)
  })

  it('attaquant avec homme du match + 2 buts normaux + défaite = 13 pts', () => {
    const result = calculatePlayerPoints(
      makeStats({
        result: 'loss',
        goals: 2,
        motm: true,
      }),
      'FWD',
    )
    // défaite 0, 2 buts FWD 10, MOTM 3 = 13
    expect(result.total).toBe(13)
  })
})

// ---------------------------------------------------------------------------
// Cas limite
// ---------------------------------------------------------------------------

describe('cas limites', () => {
  it("joueur qui n'a pas joué (played: false) → 0 pts, tous les champs à 0", () => {
    const result = calculatePlayerPoints(
      makeStats({
        played: false,
        result: 'win',
        goals: 2,
        assists: 1,
        motm: true,
      }),
      'FWD',
    )
    expect(result.total).toBe(0)
    expect(result.win_bonus).toBe(0)
    expect(result.goal_position_bonus).toBe(0)
    expect(result.assist_bonus).toBe(0)
    expect(result.motm_bonus).toBe(0)
  })

  it('carton rouge seul → total négatif (-10)', () => {
    const result = calculatePlayerPoints(makeStats({ red_cards: 1 }), 'GK')
    expect(result.total).toBe(-10)
  })

  it('aucune stat → total 0', () => {
    const result = calculatePlayerPoints(makeStats({}), 'FWD')
    expect(result.total).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// formatBreakdown
// ---------------------------------------------------------------------------

describe('formatBreakdown', () => {
  it('ne retourne que les entrées non nulles', () => {
    const entries = formatBreakdown(
      calculatePlayerPoints(makeStats({ result: 'win', goals: 1 }), 'FWD'),
    )
    expect(entries.length).toBe(2)
    expect(entries.find((e) => e.label === 'Victoire')?.points).toBe(3)
    expect(entries.find((e) => e.label === 'But (bonus position)')?.points).toBe(5)
  })

  it('retourne tableau vide si aucun point', () => {
    expect(formatBreakdown(calculatePlayerPoints(makeStats({}), 'MID'))).toHaveLength(0)
  })

  it('inclut le malus carton rouge avec valeur négative', () => {
    const entries = formatBreakdown(
      calculatePlayerPoints(makeStats({ red_cards: 1 }), 'MID'),
    )
    expect(entries.find((e) => e.label === 'Carton rouge')?.points).toBe(-10)
  })
})
