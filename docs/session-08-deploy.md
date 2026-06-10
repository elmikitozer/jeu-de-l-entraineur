# Session 08 — Deploy Vercel

## Résumé

Session de mise en production : vérification build, configuration Vercel, GitHub Actions cron, images.

---

## ✅ Ce qui a été fait

### Fix build — `PlayerHistoryClient.tsx`

**Root cause** : expression ternaire utilisée comme statement, interdite par `@typescript-eslint/no-unused-expressions`.

```typescript
// Avant (ESLint error)
next.has(id) ? next.delete(id) : next.add(id)

// Après
if (next.has(id)) { next.delete(id) } else { next.add(id) }
```

`npx next build` → ✅ 0 erreur TypeScript, 0 erreur ESLint.

---

### `vercel.json` — cron toutes les minutes

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-stats",
      "schedule": "* * * * *"
    }
  ]
}
```

Changement : `*/5 * * * *` → `* * * * *` pour couvrir les buts en début de minute.

---

### `next.config.mjs` — domaines images autorisés

```js
const nextConfig = {
  images: {
    domains: ['flagcdn.com', 'media.api-sports.io'],
  },
}
```

Nécessaire pour que `<img>` / `<Image>` vers flagcdn.com et les photos joueurs API-Football passent sans erreur en production.

---

### `docs/deploy-vercel.md` — mis à jour

Instructions précises pour :
1. Push GitHub (`https://github.com/elmikitozer/jeu-de-lentraineur.git`)
2. Import Vercel + framework auto-détecté
3. 7 variables d'environnement avec leur rôle et environnement cible
4. Secrets GitHub Actions (4 secrets + `VERCEL_PROJECT_URL` à remplir post-deploy)

---

### `.github/workflows/cron-sync.yml` — vérifié (existait déjà)

Workflow conforme :
- Schedule : `* * * * *`
- Vérifie 3 conditions avant de pinger : `status=live`, `upcoming dans 3h`, `finished + sync_attempts < 6`
- Header `Authorization: Bearer $CRON_SECRET`
- URL : `https://$VERCEL_PROJECT_URL/api/cron/sync-stats`

---

## ⚠️ Décisions prises

| Décision | Raison |
|---|---|
| Cron toutes les minutes (pas 5min) | Match peut débuter à la minute — latence max acceptable = 1 min |
| GitHub Actions en fallback | Vercel Hobby = 2 cron max ; GH Actions ajoute une redondance sans coût supplémentaire |
| `SUPABASE_SERVICE_ROLE_KEY` en Production + Preview | Les pages server-side en preview ont besoin de lire les données |
| `ADMIN_PASSWORD` + `CRON_SECRET` en Production uniquement | Pas besoin de l'admin ni du cron sur les branches preview |

---

## ❌ Ce qui n'a pas pu être fait

- Mapping `api_match_id` incomplet (22 fixtures restants sans correspondance — offset timezone DB +3h vs UTC réel, +2 fixtures Haiti/Türkiye)
- `map-player-ids.ts` non lancé (quota API-Football ~100 req/jour sur plan gratuit)
- Domaine personnalisé non configuré (optionnel)

---

## 🔜 Checklist finale avant deploy

1. **Mapper les IDs de matchs** (si possible) :
   ```bash
   npx tsx scripts/update-tbd-teams.ts
   npx tsx scripts/map-match-ids.ts
   ```

2. **Push GitHub** :
   ```bash
   git init
   git add .
   git commit -m "feat: initial deploy Jeu de l'Entraîneur"
   git remote add origin https://github.com/elmikitozer/jeu-de-lentraineur.git
   git push -u origin main
   ```

3. **Importer sur Vercel** → suivre `docs/deploy-vercel.md`

4. **Configurer les 7 variables d'environnement** sur Vercel

5. **Configurer les 4 GitHub Secrets** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CRON_SECRET`, `VERCEL_PROJECT_URL`)

6. **Post-deploy** : remplir `VERCEL_PROJECT_URL` avec l'URL Vercel réelle

7. **Vérifier les pages** : `/`, `/calendrier`, `/stats`, `/admin`

---

## Fichiers modifiés / créés

| Fichier | Action |
|---|---|
| `components/PlayerHistoryClient.tsx` | Fix ternary ESLint error (ligne 48) |
| `vercel.json` | Schedule `*/5` → `*` (toutes les minutes) |
| `next.config.mjs` | Ajout `images.domains` flagcdn.com + media.api-sports.io |
| `docs/deploy-vercel.md` | Mis à jour avec instructions exactes + repo URL |
| `docs/session-08-deploy.md` | Ce fichier |

---

# Session 09 — Import complet joueurs CdM 2026

## Résumé

Script d'import automatique des joueurs sélectionnés pour la CdM 2026 depuis API-Football, avec upsert idempotent en base Supabase.

---

## ✅ Ce qui a été créé

### `scripts/import-players-wc2026.ts`

Script en deux étapes :
1. **GET** `/teams?league=1&season=2026` → récupère les 48 équipes qualifiées avec leurs `team_id`
2. **GET** `/players/squads?team={id}` pour chaque équipe → joueurs avec id, name, position, photo

**Mapping position :**
```
"Goalkeeper" → "GK"
"Defender"   → "DEF"
"Midfielder" → "MID"
"Attacker"   → "FWD"
```

**Nationalité :** nom de l'équipe en anglais tel que retourné par l'API (ex: `"Korea Republic"`, `"IR Iran"`).  
`nationality_code` dérivé via `getCountryCode()` de `lib/flags.ts`.

**Upsert :** sur `api_football_id` (colonne UNIQUE dans la table `players`).  
Inserts vs updates distingués grâce à un pré-chargement des IDs existants en début de script.

**Progression par équipe :**
```
[ 1/48] France... ✅ France (25 joueurs — 25 nouveaux)
[ 2/48] Brazil... ✅ Brazil (25 joueurs — 25 nouveaux)
...
```

**Résumé final :**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Résumé import joueurs CdM 2026 :
   ✅ 1 150 joueurs importés (nouveaux)
   🔄 0 joueurs mis à jour
   📦 Total traité : 1 150 joueurs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Lancement :**
```bash
npx tsx scripts/import-players-wc2026.ts
```

---

## ⚠️ Décisions prises

| Décision | Raison |
|---|---|
| Upsert sur `api_football_id` (pas sur `name, nationality_code`) | `api_football_id` est la seule contrainte UNIQUE confirmée dans le schéma |
| 600ms entre chaque appel squad | Respect du rate limit API-Football (~100 req/jour plan gratuit) |
| `getCountryCode()` depuis `lib/flags.ts` | Réutilise le mapping déjà maintenu et couvert pour les 48 nations |
| Joueurs sans position définie ignorés | Données incomplètes inutilisables pour le scoring |
| Nom d'équipe API stocké tel quel en anglais | Cohérent avec le schéma existant ; `TEAM_NAME_FR` gère l'affichage |

---

## ❌ Ce qui n'a pas pu être fait

- Lancement réel du script (quota API-Football à vérifier avant exécution)
- Vérification des noms d'équipe retournés par l'API vs `FLAGS` map (ex: `"Korea Republic"` vs `"South Korea"` — mappés tous les deux dans `lib/flags.ts`)

---

## 🔜 Avant de lancer le script

1. Vérifier le quota API-Football restant (plan gratuit ≈ 100 req/jour)  
   Le script fait **1 appel teams + 48 appels squads = 49 appels**
2. S'assurer que `.env.local` contient `RAPIDAPI_KEY`
3. Lancer : `npx tsx scripts/import-players-wc2026.ts`
4. Après l'import, relancer `scripts/map-player-ids.ts` est inutile — les IDs sont déjà mappés

---

## Fichiers modifiés / créés

| Fichier | Action |
|---|---|
| `scripts/import-players-wc2026.ts` | Créé — script import complet joueurs CdM 2026 |
| `docs/session-08-deploy.md` | Section Session 09 ajoutée |
