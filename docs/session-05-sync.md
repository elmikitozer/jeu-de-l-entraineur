# Session 05 — Sync API Football + Cron

## Fichiers créés / modifiés

| Fichier | Action | Rôle |
|---------|--------|------|
| `supabase/migrations/001_add_verified_at.sql` | Créé | Ajoute `last_verified_at` et `sync_attempts` à `matches`, contrainte unique sur `points_log` |
| `lib/types.ts` | Modifié | `Match` : 2 nouveaux champs `last_verified_at` + `sync_attempts` |
| `lib/api-football.ts` | Implémenté | Wrapper RapidAPI : `fetchLiveMatchStats`, `fetchFinalMatchStats`, `fetchFixtureResult` |
| `lib/sync-engine.ts` | Créé | Moteur de sync : `syncMatch()` → player_stats → points_log → participants.total_points |
| `app/api/cron/sync-stats/route.ts` | Implémenté | GET cron handler : sélectionne les matchs à syncer et appelle syncMatch() |
| `.github/workflows/cron-sync.yml` | Créé | GitHub Actions : toutes les 1 minute, vérifie avant de pinger le cron |
| `docs/session-05-sync.md` | Créé | Ce fichier |

---

## Architecture de sync

### 3 modes

| Mode | Condition | Endpoint API | Status résultant |
|------|-----------|-------------|-----------------|
| `live` | `now ∈ [kickoff, kickoff+2h45]` | `/fixtures?id={id}&live=all` | reste `live` |
| `final` | `now > kickoff+2h45` et status ≠ `finished` | `/fixtures/players` + events | passe à `finished` |
| `post-check` | `status = finished`, `sync_attempts < 6`, `last_verified_at < now-1h` | `/fixtures/players` + events | reste `finished` |

### Flux de données

```
GitHub Actions (chaque minute)
  → vérifie Supabase REST API (live? upcoming? post-check?)
  → si oui : GET /api/cron/sync-stats (Authorization: Bearer CRON_SECRET)
      → cron handler
          → liste les matchs à syncer (scheduled/live/finished)
          → syncMatch(matchId) pour chaque match
              → fetchLiveMatchStats() ou fetchFinalMatchStats()
              → pour chaque joueur ayant api_football_id dans notre DB :
                  → upsert player_stats (UNIQUE player_id,match_id)
                  → calculatePlayerPoints() → scoring.ts
                  → upsert points_log (UNIQUE participant_id,player_id,match_id)
              → recalcule participants.total_points = SUM(points_log.total_points)
              → update matches (status, scores, last_verified_at, sync_attempts)
          → retourne JSON { synced, matchesProcessed, errors }
```

### Idempotence

- `player_stats` : upsert sur `(player_id, match_id)`
- `points_log` : upsert sur `(participant_id, player_id, match_id)` — nécessite la migration `001_add_verified_at.sql`
- Relancer le cron 2× de suite → mêmes données, pas de doublons

---

## ⚙️ Appliquer la migration SQL

```bash
# Option 1 : Supabase Dashboard
# → SQL Editor → coller le contenu de supabase/migrations/001_add_verified_at.sql → Run

# Option 2 : psql direct (remplacer les placeholders)
source .env.local
psql "postgresql://postgres:${DB_PASSWORD}@db.VOTRE_PROJECT_REF.supabase.co:5432/postgres" \
  -f supabase/migrations/001_add_verified_at.sql
```

> **Note :** `DB_PASSWORD` doit être dans `.env.local`. Le `project_ref` se trouve dans les paramètres Supabase.

---

## 🔑 Configuration des secrets GitHub Actions

Dans le repo GitHub : **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Valeur | Source |
|--------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase | Dashboard Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key | idem |
| `CRON_SECRET` | Valeur de `.env.local` | Générer avec `openssl rand -hex 32` |
| `VERCEL_PROJECT_URL` | Domaine de prod sans `https://` | ex: `mon-projet.vercel.app` |

---

## 🔗 Mapper les api_football_id sur les joueurs

Les joueurs seedés ont `api_football_id = null`. Il faut les mapper sur les IDs API-Football avant que le cron puisse fetcher leurs stats.

### Méthode manuelle (recommandée pour les 50 joueurs du seed)

1. Aller sur [API-Football → Players](https://www.api-football.com/documentation-v3#tag/Players)
2. Chercher par nom : `GET /players?name=Mbappe&season=2026`
3. Récupérer le champ `player.id` dans la réponse
4. Dans Supabase Dashboard → Table Editor → `players` → modifier `api_football_id`

### Script de mapping (à créer en Session 06)

```typescript
// scripts/map-player-ids.ts (à implémenter)
// Recherche chaque joueur par nom dans API-Football et met à jour api_football_id
```

### Mapping IDs des matchs

Les `api_match_id` actuels (1–104) viennent du CSV Kaggle, pas de l'API-Football réelle.  
En Session 06, il faudra :
1. Fetcher les fixtures API-Football pour CdM 2026 (`/fixtures?league=1&season=2026`)
2. Faire correspondre par équipes + date
3. Mettre à jour `matches.api_match_id`

---

## 🧪 Tester le cron en local

### Démarrer l'app en dev

```bash
npm run dev
# → http://localhost:3000
```

### Simuler l'appel cron

```bash
# Avec CRON_SECRET depuis .env.local
source .env.local
curl -X GET \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "http://localhost:3000/api/cron/sync-stats"

# Réponse attendue (sans matchs en cours) :
# {"synced":0,"matchesProcessed":0,"errors":[]}
```

### Insérer un match de test en statut 'live'

```sql
-- Dans Supabase Dashboard → SQL Editor
UPDATE matches
SET status = 'live', api_match_id = 123456  -- remplacer par un vrai ID API-Football
WHERE id = (SELECT id FROM matches LIMIT 1);
```

Puis relancer le curl → le cron appellera `syncMatch()` pour ce match.

---

## ✅ Ce qui a été créé

- **Migration SQL** : `last_verified_at`, `sync_attempts`, contrainte unique `points_log`
- **`lib/api-football.ts`** : 3 fonctions avec types internes API-Football v3
- **`lib/sync-engine.ts`** : `syncMatch()` complet, idempotent, avec gestion d'erreur par joueur
- **Route cron** : sélection intelligente des matchs, résumé JSON, auth Bearer
- **GitHub Actions** : pré-vérification Supabase avant ping, `workflow_dispatch` pour tests manuels

## ⚠️ Décisions prises

- **MOTM par rating** : API-Football n'a pas de champ MOTM explicite. On utilise le joueur avec le rating le plus élevé dans `/fixtures/players`. Le post-check (x6 pendant 6h) corrigera si API-Football corrige ses ratings.
- **freekickGoal depuis events** : `/fixtures/players` ne distingue pas les types de buts. On parse les events (`type=Goal, detail=Free Kick`) pour obtenir ce champ.
- **penaltySaved live = 0** : les events ne permettent pas de déterminer qui a arrêté un penalty. Sera corrigé au sync final via `penalty.saved` de `/fixtures/players`.
- **sync_attempts ne compte que les post-match** : les syncs live ne l'incrémentent pas pour ne pas bloquer les post-checks (un match live peut avoir 90+ syncs).
- **Fallback live→final** : si `/fixtures?live=all` retourne vide (match pas encore détecté live par l'API), on fait un fallback sur `/fixtures/players`.

## ❌ Ce qui n'a pas pu être fait

- **Mapping api_football_id** : les joueurs seedés ont `api_football_id = null`. Le cron fonctionne mais ne traitera aucun joueur tant que les IDs ne sont pas mappés.
- **Mapping api_match_id des matchs** : les IDs Kaggle (1-104) ≠ IDs API-Football. Le cron déclenchera les fetches mais les réponses seront vides.
- **Script de mapping automatique** : à créer en Session 06.

## 🔜 Prérequis avant Session 06

1. **Appliquer la migration** `supabase/migrations/001_add_verified_at.sql` dans Supabase
2. **Configurer les secrets GitHub Actions** (4 secrets listés ci-dessus)
3. **Mapper manuellement quelques `api_football_id`** pour tester le cron en conditions réelles
4. **Mapper les `api_match_id`** des premiers matchs CdM 2026 via API-Football
5. Session 06 = **Pages UI publiques** (Leaderboard, équipes, joueur, stats)
