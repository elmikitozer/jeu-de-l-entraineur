# Session 03 — Seed calendrier CdM 2026

## Fichiers créés / modifiés

| Fichier | Action | Rôle |
|---------|--------|------|
| `scripts/kaggle/matches.csv` | Fourni par l'utilisateur | 104 matchs CdM 2026 avec IDs, équipes, villes, horaires locaux |
| `scripts/kaggle/teams.csv` | Fourni par l'utilisateur | 48 équipes avec codes FIFA et groupe |
| `scripts/kaggle/host_cities.csv` | Fourni par l'utilisateur | 16 villes hôtes avec stades |
| `scripts/kaggle/tournament_stages.csv` | Fourni par l'utilisateur | 7 phases du tournoi |
| `scripts/seed-matches.ts` | Créé | Lit les 4 CSV Kaggle, joint les données, upsert dans Supabase |
| `scripts/seed-players.ts` | Créé | 50 joueurs notables hardcodés, insert idempotent dans Supabase |
| `package.json` | Modifié | Scripts `seed:matches` et `seed:players` ajoutés |
| `docs/session-03-seed.md` | Créé | Ce fichier |

## Structure des données Kaggle

Les 4 CSV forment une base relationnelle :

```
matches.csv          teams.csv            host_cities.csv        tournament_stages.csv
───────────          ─────────            ───────────────        ─────────────────────
id                   id                   id                     id
match_number         team_name            city_name              stage_name
home_team_id ───→    fifa_code            country                stage_order
away_team_id ───→    group_letter         venue_name
city_id      ──────────────────────────→ region_cluster
stage_id     ──────────────────────────────────────────────────→
kickoff_at
match_label
```

## Format de sortie (table `matches`)

Le script `seed-matches.ts` produit ces colonnes :

| Colonne DB | Source Kaggle | Transformation |
|------------|---------------|----------------|
| `api_match_id` | `matches.id` | `parseInt()` |
| `home_team` | `teams.team_name` (via home_team_id) | `'TBD'` si NULL (knockout) |
| `away_team` | `teams.team_name` (via away_team_id) | `'TBD'` si NULL (knockout) |
| `date` | `matches.kickoff_at` | Offset local → UTC ISO 8601 |
| `venue` | `host_cities.venue_name + city_name` | Concaténé |
| `stage` | `tournament_stages.stage_name` | Traduit FR + "Groupe X" pour la phase de poules |
| `status` | — | Toujours `'scheduled'` au seed |

### Conversion des dates

`kickoff_at` est en heure locale avec offset (ex: `"2026-06-11 15:00:00-06"`).  
Le script normalise en `"2026-06-11T15:00:00-06:00"` puis appelle `new Date().toISOString()` pour obtenir l'UTC.

## Commandes pour lancer les seeds

```bash
# Prérequis : .env.local rempli + schéma Supabase appliqué

# 1. Importer les 104 matchs
npm run seed:matches
# ou directement :
npx tsx scripts/seed-matches.ts

# 2. Importer les 50 joueurs de test
npm run seed:players
# ou directement :
npx tsx scripts/seed-players.ts
```

Les deux scripts sont **idempotents** : relançables sans créer de doublons.

## Données importées

### Matchs (104 au total)

| Phase | Nb matchs | Période |
|-------|-----------|---------|
| Phase de groupes (12 groupes × 6 matchs) | 72 | 11 juin – 27 juin 2026 |
| Tour de 32 | 16 | 28 juin – 3 juillet 2026 |
| Huitièmes de finale | 8 | 4 – 7 juillet 2026 |
| Quarts de finale | 4 | 9 – 11 juillet 2026 |
| Demi-finales | 2 | 14 – 15 juillet 2026 |
| Match pour la 3e place | 1 | 18 juillet 2026 |
| Finale | 1 | 19 juillet 2026 |

**Équipes du groupe stage** : les 48 équipes réelles (dont 4 placeholders "Winner UEFA Playoff X" pas encore déterminés à la date de création du dataset).

**Phases à partir du Tour de 32** : `home_team = 'TBD'`, `away_team = 'TBD'` — seront mis à jour par le cron de sync lors des matchs.

### 16 villes hôtes

| Pays | Villes |
|------|--------|
| USA (11) | Atlanta, Boston, Dallas, Houston, Kansas City, Los Angeles, Miami, New York/NJ, Philadelphia, San Francisco Bay Area, Seattle |
| Canada (2) | Toronto, Vancouver |
| Mexique (3) | Guadalajara, Mexico City, Monterrey |

### Joueurs seed (50 joueurs)

| Position | Nb | Nationalités représentées |
|----------|----|--------------------------|
| GK | 8 | AR, BE, BR, EN, IT, MA, FR, DE |
| DEF | 12 | AR, BR, NL, PT, FR, IT, MA, EN, HR, UY, DE |
| MID | 13 | BE, ES, EN, NL, UY, BR, DE, MA, AR, PT, FR, HR |
| FWD | 17 | FR, AR, BR, PT, EN, DE, ES, SN, NL, HR, CO |

## Décisions techniques

### Source Kaggle plutôt que CSV généré
L'utilisateur a fourni un dataset Kaggle avec les données officielles CdM 2026 (horaires réels, équipes confirmées). Ce dataset a été utilisé à la place d'un CSV approximatif généré manuellement.

### api_match_id = entier (pas "WC2026_001")
La colonne `api_match_id` de la DB est `INTEGER`. Les IDs Kaggle (1–104) sont utilisés comme clé de déduplication au seed. Lors de la sync API-Football (Session 6), les vrais IDs API-Football seront différents — il faudra soit faire un mapping, soit clear et re-seed depuis l'API.

### Phase de groupes : 72 matchs (pas 48)
Le PROJECT.md mentionnait "48 matchs" pour la phase de groupes. La formule exacte est : 12 groupes × C(4,2) = 12 × 6 = **72 matchs**. Le dataset Kaggle confirme 72 matchs de groupe + 32 matchs K.O. = 104 total.

### Traduction FR des phases
`STAGE_FR` traduit les noms anglais Kaggle (ex: `"Round of 16"` → `"Huitièmes de finale"`). Pour la phase de groupes, le label inclut la lettre du groupe (ex: `"Phase de groupes - Groupe A"`).

### Joueurs seed sans api_football_id
Les 50 joueurs ont `api_football_id = null`. La déduplication se fait par `(name, nationality_code)`. En PostgreSQL, `UNIQUE` avec des NULL multiples est permis (NULL ≠ NULL), donc pas de conflit sur la contrainte unique de la table.

## Prérequis avant Session 04

1. **`.env.local` rempli** avec les 3 clés Supabase
2. **`supabase/schema.sql` exécuté** dans le SQL Editor Supabase
3. **Tester** `npm run seed:matches` et `npm run seed:players` — vérifier dans le dashboard Supabase que les tables sont remplies
4. Session 04 = **Interface admin** (saisie des équipes des participants)
