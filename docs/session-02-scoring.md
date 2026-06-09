# Session 02 — Moteur de scoring

## Fichiers créés / modifiés

| Fichier | Action | Rôle |
|---------|--------|------|
| `lib/scoring.ts` | Remplacé placeholder | Moteur de calcul des points, pur TypeScript |
| `lib/scoring.test.ts` | Créé | 30 tests unitaires Vitest |
| `vitest.config.ts` | Créé | Config Vitest (node env + alias `@/`) |
| `package.json` | Modifié | Scripts `test` et `test:watch` ajoutés |
| `docs/session-02-scoring.md` | Créé | Ce fichier |

## Architecture de scoring.ts

### Types exportés

| Type | Description |
|------|-------------|
| `ScoringResult` | `PointsBreakdown & { total: number }` — retour de `calculatePlayerPoints` |
| `BreakdownEntry` | `{ label: string; points: number }` — entrée lisible pour l'UI |

### Fonctions exportées

#### `calculatePlayerPoints(stats, position) → ScoringResult`

Fonction pure. Prend les stats brutes d'un joueur pour un match et sa position, retourne le breakdown complet.

**Cas `played: false`** : retourne immédiatement tous les champs à 0. Les stats du match (résultat, buts, etc.) sont ignorées.

**Logique des buts** :

```
goals = total buts marqués dans le match
freekick_goal ≤ goals : sous-ensemble marqués sur coup franc direct
penalty_scored ≤ goals : sous-ensemble marqués sur penalty hors TAB
normalGoals = goals - freekick_goal - penalty_scored

goal_position_bonus = (normalGoals + freekick_goal) × GOAL_POSITION_BONUS[position]
goal_freekick_bonus = freekick_goal × 15
goal_penalty_bonus  = penalty_scored × 5
```

Détail des bonus de position :

| Position | Points par but |
|----------|---------------|
| GK | +25 |
| DEF | +15 |
| MID | +10 |
| FWD | +5 |

**Cleansheet** : uniquement pour les GK (`position === 'GK' && stats.cleansheet`). Les DEF ne bénéficient pas du bonus cleansheet (règle PROJECT.md).

#### `formatBreakdown(breakdown) → BreakdownEntry[]`

Utilitaire d'affichage. Convertit un `PointsBreakdown` (ou `ScoringResult`) en tableau de `{ label, points }`, en filtrant les entrées à 0. Compatible `ScoringResult` par sous-typage structurel.

### Constantes

```typescript
const GOAL_POSITION_BONUS = { GK: 25, DEF: 15, MID: 10, FWD: 5 }
const FREEKICK_BONUS = 15
const PENALTY_GOAL_FLAT = 5
const WIN_BONUS = 3
const DRAW_BONUS = 1
const ASSIST_BONUS = 3
const MOTM_BONUS = 3
const CLEANSHEET_BONUS = 5
const PENALTY_SAVED_BONUS = 5
const RED_CARD_MALUS = -10
```

## Cas de test (30 tests — tous ✅)

### Résultat collectif (3 tests)
- Victoire → win_bonus = 3, total = 3
- Nul → draw_bonus = 1, total = 1
- Défaite → total = 0

### Buts gardien — 3 cas (3 tests)
- But normal GK → goal_position_bonus = 25
- But coup franc GK → goal_position_bonus = 25 + goal_freekick_bonus = 15 = total buts 40
- But penalty GK → goal_penalty_bonus = 5, goal_position_bonus = 0

### Buts défenseur (2 tests)
- But normal DEF → 15 pts
- But coup franc DEF → 15 (position) + 15 (coup franc) = 30 pts — vérifie cumulabilité

### Buts milieu (1 test)
- But normal MID → 10 pts

### Buts attaquant (4 tests)
- But normal FWD → 5 pts
- But penalty FWD → 5 pts flat, goal_position_bonus = 0
- Doublé FWD → goal_position_bonus = 10
- Doublé mixte (1 normal + 1 coup franc) → 10 (position ×2) + 15 (coup franc) = 25 pts

### Autres performances (5 tests)
- 1 passe décisive → 3 pts
- 2 passes décisives → 6 pts
- Homme du match → 3 pts
- Gardien cleansheet → 5 pts
- Défenseur cleansheet → 0 pt (bonus réservé GK)

### Penalty arrêté (2 tests)
- 1 penalty arrêté → 5 pts
- 2 penalties arrêtés → 10 pts

### Carton rouge (1 test)
- 1 carton rouge → -10 pts

### Combinaisons complexes (3 tests)
- **GK : victoire + cleansheet + penalty arrêté + but = 38 pts**
  - win 3 + cleansheet 5 + penalty_saved 5 + goal GK 25 = **38**
- MID : nul + but coup franc + passe + carton rouge = 19 pts
  - draw 1 + goal_pos 10 + freekick 15 + assist 3 + red_card −10 = **19**
- FWD : homme du match + 2 buts + défaite = 13 pts
  - 0 + 10 + 3 = **13**

### Cas limites (3 tests)
- `played: false` → total 0, tous les champs à 0 (les stats sont ignorées)
- Carton rouge seul → total −10 (total négatif possible)
- Aucune stat → total 0

### formatBreakdown (3 tests)
- Filtre les entrées nulles
- Retourne tableau vide si aucun point
- Malus carton rouge à valeur négative

## Output `npx vitest run`

```
 RUN  v4.1.8 /Users/mikayay/Documents/Perso/Jeu de l'entraineur

 Test Files  1 passed (1)
      Tests  30 passed (30)
   Start at  22:19:21
   Duration  243ms
```

## Décisions techniques

### Pas de label dans le PointsBreakdown
`PointsBreakdown` stocke uniquement des numbers pour la BDD (JSONB). Les labels FR vivent dans `BREAKDOWN_LABELS` et `formatBreakdown` — séparation claire données/présentation.

### Compatibilité ScoringResult → PointsBreakdown
`ScoringResult = PointsBreakdown & { total: number }`. Passer un `ScoringResult` à `formatBreakdown(breakdown: PointsBreakdown)` est valide par sous-typage structurel TypeScript. Le champ `total` est ignoré par l'itération sur `BREAKDOWN_LABELS`.

### Cleansheet DEF non implémenté
Le PROJECT.md ne mentionne le cleansheet que pour le gardien. Le bonus n'est pas accordé aux DEF. Si la règle évolue, il suffit d'élargir le `position === 'GK'` check.

### Test du doublé mixte (ligne 204)
Vérifie que les deux buts d'un doublé 1-normal/1-coup-franc obtiennent chacun le bonus de position (= ×2), plus le bonus coup franc sur un seul des deux. Cela valide que `normalGoals + freekick_goal` est bien utilisé pour `goal_position_bonus`.

## Prérequis avant Session 03

1. **Variables `.env.local`** remplies (Supabase + RapidAPI) pour tester le seed
2. **Schéma Supabase appliqué** (`supabase/schema.sql`) — la table `matches` doit exister
3. Décider si le seed s'appuie sur l'API-Football ou sur un CSV statique CdM 2026
