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
