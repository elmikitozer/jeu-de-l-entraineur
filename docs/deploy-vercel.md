# Déploiement sur Vercel

## Prérequis

- Compte Vercel (gratuit pour ce type de projet)
- Repo GitHub avec le code (branche `main`)
- Fichier `.env.local` configuré localement

---

## Étape 1 — Pousser sur GitHub

Si ce n'est pas déjà fait :

```bash
git init
git add .
git commit -m "chore: init projet jeu de l'entraîneur"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/jeu-entraineur.git
git push -u origin main
```

---

## Étape 2 — Importer le projet dans Vercel

1. Aller sur https://vercel.com/new
2. Cliquer **"Import Git Repository"**
3. Sélectionner le repo `jeu-entraineur`
4. Framework : **Next.js** (détecté automatiquement)
5. Root directory : `.` (racine)
6. Ne pas toucher aux Build / Output settings (Next.js par défaut)
7. **Ne pas déployer encore** → configurer d'abord les variables d'environnement

---

## Étape 3 — Variables d'environnement

Dans **Settings → Environment Variables** du projet Vercel, ajouter les variables suivantes.

| Variable | Valeur | Environnements |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (anon key) | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (service_role key) | Production, Preview, Development |
| `RAPIDAPI_KEY` | clé API-Football | Production, Preview, Development |
| `RAPIDAPI_HOST` | `v3.football.api-sports.io` | Production, Preview, Development |
| `ADMIN_PASSWORD` | mot de passe admin | Production uniquement |
| `CRON_SECRET` | token cron aléatoire (`openssl rand -hex 32`) | Production uniquement |
| `NEXT_PUBLIC_APP_URL` | `https://ton-domaine.vercel.app` | Production |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` et `ADMIN_PASSWORD` ne doivent JAMAIS être exposés côté client.
> Vérifier qu'aucune variable `NEXT_PUBLIC_` ne contient ces valeurs sensibles.

---

## Étape 4 — Premier déploiement

1. Cliquer **Deploy**
2. Attendre ~2 min (build Next.js)
3. Vérifier l'URL de preview : `https://jeu-entraineur-xxx.vercel.app`
4. Tester les pages : `/`, `/calendrier`, `/stats`, `/team/[id]`

---

## Étape 5 — Cron job (sync des scores)

Le cron endpoint `/api/cron/sync-scores` doit être appelé automatiquement.

### Option A — Vercel Cron (recommandé)

Ajouter dans `vercel.json` (à créer à la racine) :

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-scores",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Le header `Authorization: Bearer {CRON_SECRET}` est ajouté automatiquement par Vercel.

> Le plan Hobby Vercel inclut 2 cron jobs (minimum interval : 1 minute).

### Option B — GitHub Actions

Créer `.github/workflows/sync-scores.yml` :

```yaml
name: Sync Scores
on:
  schedule:
    - cron: '*/5 * * * *'
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Call sync endpoint
        run: |
          curl -X POST https://ton-domaine.vercel.app/api/cron/sync-scores \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Ajouter `CRON_SECRET` dans **GitHub → Settings → Secrets → Actions**.

---

## Étape 6 — Domaine personnalisé (optionnel)

1. Vercel → Project → **Domains**
2. Ajouter le domaine (ex: `cdm2026.ton-domaine.fr`)
3. Configurer le DNS chez ton registrar :
   - `CNAME` : `cname.vercel-dns.com` (pour sous-domaine)
   - ou `A` : `76.76.21.21` (pour domaine racine)
4. Mettre à jour `NEXT_PUBLIC_APP_URL` avec le vrai domaine

---

## Variables GitHub Actions (pour CI)

Si tu veux un pipeline CI/CD complet, ajouter dans **GitHub → Settings → Secrets** :

| Secret | Valeur |
|---|---|
| `VERCEL_TOKEN` | Token Vercel (Account → Tokens) |
| `VERCEL_ORG_ID` | Org ID (visible dans `.vercel/project.json` après `vercel link`) |
| `VERCEL_PROJECT_ID` | Project ID (idem) |
| `CRON_SECRET` | Même valeur que dans Vercel |

---

## Vérifications post-déploiement

- [ ] Page `/` charge le classement (données Supabase)
- [ ] Page `/calendrier` affiche les matchs groupés par phase
- [ ] Page `/stats` affiche la cagnotte
- [ ] Mode sombre fonctionne sans flash au rechargement
- [ ] Menu mobile fonctionne sur iPhone/Android
- [ ] `/admin` redirige vers `/admin/login` si non authentifié
- [ ] Cron job tourne toutes les 5 min (vérifier les logs Vercel)

---

## Dépannage fréquent

**Build échoue avec TypeScript errors**
→ Lancer `npx tsc --noEmit` localement avant de push.

**Données vides sur Vercel mais OK en local**
→ Vérifier les variables d'environnement dans Vercel Settings.
→ Les variables sans `NEXT_PUBLIC_` ne sont disponibles qu'au runtime serveur, pas au build.

**Calendrier vide**
→ `SUPABASE_SERVICE_ROLE_KEY` manquante ou incorrecte côté Vercel.

**Admin inaccessible**
→ `ADMIN_PASSWORD` non définie pour l'environnement Production.
