# Session 09 — Audit correctness métier + correctifs scoring

> Audit externe de la logique de scoring contre le barème officiel (PROJECT.md),
> puis correction des écarts identifiés. Aucune règle du barème n'a été modifiée :
> seul le code qui l'implémente a été corrigé.

## Périmètre audité

- `lib/scoring.ts` — moteur de calcul des points (fonctions pures)
- `lib/sync-engine.ts` — orchestration sync API → Supabase
- `lib/api-football.ts` — dérivation des stats depuis API-Football
- `supabase/migrations/001_add_verified_at.sql` — contrainte d'idempotence
- Données réelles en base (match MEX 2-0 RSA)

## Verdict global

Le cœur de `scoring.ts` est **conforme au barème** sur toutes les règles testables.
Recalcul manuel sur MEX-RSA (Rangel, Montes, Quiñones, Jiménez) : **aucun écart**.
Idempotence vérifiée en prod (upsert `onConflict` sans doublon, totaux participants
cohérents avec la somme des `points_log`).

Les écarts trouvés portaient sur la **dérivation des données** (`api-football.ts`)
et sur une **migration invalide**, pas sur le calcul lui-même.

## Correctifs appliqués

### 1. Résultat aux tirs au but → NUL (convention FIFA)
**Avant** : un match à élimination décidé aux TAB créditait le qualifié d'une
victoire (+3) et l'éliminé d'une défaite (0), parce que `resolveTeamResults`
lisait le flag `winner` de l'API avant le score.

**Après** : `resolveTeamResults` reçoit `decidedByShootout`. Si le statut API est
`PEN`, les deux équipes reçoivent un **nul (+1/+1)** — un match décidé aux TAB est
officiellement un nul. Décision produit validée. Câblé dans les modes live et final.

`lib/api-football.ts` — `resolveTeamResults`, `buildStatsFromEvents`, `fetchFinalMatchStats`.

### 2. Homme du match — exclusion des non-entrants
**Avant** : le MOTM (meilleur rating) pouvait théoriquement tomber sur un
remplaçant non utilisé conservant un rating résiduel.

**Après** : éligibilité MOTM restreinte aux joueurs avec `minutes > 0`.
Le rating reste un **proxy** (API-Football n'expose pas de MOTM officiel) — documenté.

### 3. Arrêts de penalty en TAB — limite de donnée documentée
Le barème prévoit « penalty arrêté (en jeu ou TAB) ». Les events API-Football ne
permettent pas d'attribuer fiablement un arrêt en séance au gardien (les tirs
manqués n'y distinguent pas « arrêté » de « hors cadre » et ne nomment pas le
gardien). On crédite ce que le champ `penalty.saved` de `/fixtures/players`
fournit. La limite vient de la **source**, pas du calcul — documenté sur
`RawPlayerStats.penaltySaved`.

### 4. Migration 001 — syntaxe PostgreSQL invalide
**Avant** : `ALTER TABLE points_log ADD CONSTRAINT IF NOT EXISTS …` — syntaxe non
supportée par PostgreSQL ; le fichier plantait à l'exécution (la contrainte
existait en prod par un autre chemin).

**Après** : bloc `DO $$ … pg_constraint … $$` conditionnel, idempotent et
rejouable. Une DB *from scratch* obtient désormais bien la contrainte.

`supabase/migrations/001_add_verified_at.sql`.

### 5. But contre son camp — vérifié, aucun correctif nécessaire
`goals.total` d'API-Football n'inclut pas les CSC → aucun bonus de position indu.
Le mode live exclut déjà explicitement `Own Goal`. RAS.

## Cas limites confirmés conformes

| Cas | Comportement | Statut |
|-----|--------------|--------|
| Victoire AET (prolongation) | Comptée comme victoire | ✅ |
| Victoire aux TAB | Nul pour les deux (correctif #1) | ✅ |
| Joueur expulsé + équipe gagne | +3 ET −10 (cumul) | ✅ |
| Entré en cours de jeu | Touche le résultat collectif (`minutes > 0`) | ✅ |
| Double jaune = rouge | −10 (un seul rouge, pas −5−5) | ✅ |
| Re-sync du même match | Idempotent (upsert `onConflict`, totaux recalculés) | ✅ |

## Tests

- `lib/api-football.test.ts` (nouveau) — 6 cas pour `resolveTeamResults`,
  dont TAB→nul et AET→victoire.
- Suite complète : **36/36 ✅** · `tsc --noEmit` ✅.

## Reste à la main du produit (non codable sans donnée/décision)

- **Arrêts de penalty en TAB** : nécessiterait une source de données
  complémentaire pour satisfaire pleinement le barème « TAB inclus ».
- **MOTM** : reste un proxy par rating tant qu'aucune source officielle n'est branchée.
