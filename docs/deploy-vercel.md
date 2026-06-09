# Déploiement sur Vercel — Jeu de l'Entraîneur

## Prérequis

- Compte Vercel (gratuit)
- Compte GitHub avec le repo pushé
- `.env.local` configuré localement et build qui passe (`npx next build`)

---

## Étape 1 — Push sur GitHub

```bash
git init
git add .
git commit -m "feat: initial deploy Jeu de l'Entraîneur"
git branch -M main
git remote add origin https://github.com/elmikitozer/jeu-de-lentraineur.git
git push -u origin main
```

---

## Étape 2 — Import sur vercel.com

1. Aller sur **vercel.com/new**
2. Cliquer **Import Git Repository** → sélectionner `jeu-de-lentraineur`
3. Framework : **Next.js** (auto-détecté)
4. Root Directory : `./`
5. Build Command : `next build` (défaut)
6. **Ne pas déployer encore** — configurer d'abord les variables d'environnement

---

## Étape 3 — Variables d'environnement

Dans **Settings → Environment Variables** du projet Vercel :

| Variable | Description | Environnements |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service Supabase (⚠️ jamais exposée client) | Production, Preview, Development |
| `RAPIDAPI_KEY` | Clé API-Football | Production, Preview, Development |
| `RAPIDAPI_HOST` | `v3.football.api-sports.io` | Production, Preview, Development |
| `ADMIN_PASSWORD` | Mot de passe interface `/admin` | Production uniquement |
| `CRON_SECRET` | Secret cron (`openssl rand -hex 32`) | Production uniquement |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` et `ADMIN_PASSWORD` ne doivent **jamais** avoir le préfixe `NEXT_PUBLIC_`.

---

## Étape 4 — Premier déploiement

Cliquer **Deploy** → attendre ~2 min → tester :
- `/` — classement
- `/calendrier` — matchs groupés par jour
- `/stats` — cagnotte
- `/admin` — redirige vers `/admin/login` si non authentifié

---

## Étape 5 — Cron job (sync des scores)

Le fichier `vercel.json` est déjà configuré :

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

Vercel ajoute automatiquement le header `Authorization: Bearer {CRON_SECRET}` à chaque appel.

> Plan Hobby Vercel : 2 cron jobs max, intervalle minimum 1 minute.

---

## Étape 6 — GitHub Actions secrets

Pour que le workflow `.github/workflows/cron-sync.yml` fonctionne, ajouter dans **GitHub → Settings → Secrets and variables → Actions** :

| Secret | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon Supabase |
| `CRON_SECRET` | Même valeur que dans Vercel |
| `VERCEL_PROJECT_URL` | Domaine Vercel après deploy (ex: `jeu-de-lentraineur.vercel.app`) |

Le workflow GitHub Actions sert de **fallback** : il ping l'endpoint seulement s'il y a un match live ou dans les 3 prochaines heures.

---

## Vérifications post-déploiement

- [ ] Page `/` charge le classement (données Supabase)
- [ ] Page `/calendrier` affiche les matchs groupés par jour
- [ ] Page `/stats` affiche la cagnotte
- [ ] Drapeaux s'affichent (flagcdn.com autorisé dans `next.config.mjs`)
- [ ] Mode sombre fonctionne sans flash
- [ ] Menu mobile fonctionne sur mobile
- [ ] `/admin` redirige vers login si non authentifié
- [ ] Cron visible dans Vercel → Project → Cron Jobs

---

## Dépannage fréquent

| Symptôme | Cause probable |
|---|---|
| Build échoue | Lancer `npx tsc --noEmit` localement avant de push |
| Données vides | Vérifier les variables d'environnement dans Vercel Settings |
| Calendrier vide | `SUPABASE_SERVICE_ROLE_KEY` manquante ou incorrecte |
| Admin inaccessible | `ADMIN_PASSWORD` non définie pour l'environnement Production |
| Drapeaux manquants | `flagcdn.com` absent de `images.domains` dans `next.config.mjs` |
| Cron ne tourne pas | `CRON_SECRET` absente ou différente entre Vercel et GitHub Secrets |
