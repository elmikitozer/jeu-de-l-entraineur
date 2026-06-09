# ⚽ Jeu de l'Entraîneur — CdM 2026

Fantasy football pour la Coupe du Monde 2026 entre amis.  
Chaque participant compose une équipe de 11 joueurs (formation 4-3-3). Les points sont calculés automatiquement à partir des performances réelles via l'API-Football.

## Stack

- **Next.js 14** (App Router) + **TypeScript** strict
- **Supabase** (PostgreSQL) — base de données + client serveur/client
- **Tailwind CSS** — styles
- **Recharts** — graphes d'évolution
- **Vercel** — déploiement + Cron Functions

## Lancer le projet localement

### 1. Prérequis

- Node.js ≥ 18
- Un projet Supabase créé sur [app.supabase.com](https://app.supabase.com)
- Une clé RapidAPI avec accès à l'API-Football

### 2. Variables d'environnement

```bash
cp .env.example .env.local
# Remplir les valeurs dans .env.local
```

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role (secret) |
| `RAPIDAPI_KEY` | RapidAPI → API-Football → Subscribe |
| `RAPIDAPI_HOST` | `api-football-v1.p.rapidapi.com` (déjà dans .env.example) |
| `ADMIN_PASSWORD` | Mot de passe libre pour protéger `/admin` |
| `CRON_SECRET` | Générer : `openssl rand -hex 32` |

### 3. Schéma base de données

Dans le SQL Editor de Supabase, exécuter le contenu de [`/supabase/schema.sql`](./supabase/schema.sql) en une seule fois.

### 4. Installer et démarrer

```bash
npm install
npm run dev
```

Le site est accessible sur [http://localhost:3000](http://localhost:3000).

## Structure du projet

```
├── app/                          # Routes Next.js App Router
│   ├── page.tsx                  # Leaderboard (page principale)
│   ├── team/[participantId]/     # Page équipe d'un participant
│   ├── player/[playerId]/        # Détail d'un joueur
│   ├── stats/                    # Stats globales + cagnotte
│   ├── admin/                    # Interface admin (protégée)
│   └── api/
│       ├── cron/sync-stats/      # Endpoint Vercel Cron
│       └── admin/teams/          # API saisie des équipes
├── components/                   # Composants réutilisables
├── lib/
│   ├── types.ts                  # Interfaces TypeScript globales
│   ├── supabase.ts               # Clients Supabase (browser + serveur)
│   ├── scoring.ts                # Moteur de calcul des points
│   └── api-football.ts           # Wrapper API-Football
├── scripts/
│   └── seed-matches.ts           # Import one-shot du calendrier CdM 2026
├── supabase/
│   └── schema.sql                # Schéma BDD complet
└── vercel.json                   # Config crons Vercel
```

## Ordre de développement

| Session | Contenu |
|---------|---------|
| 1 ✅ | Init projet, types, schéma BDD, structure |
| 2 | Validation design (Option A / Option B) |
| 3 | Script `seed-matches.ts` — import calendrier CdM 2026 |
| 4 | Moteur de scoring (`scoring.ts`) + tests |
| 5 | Interface admin (saisie des équipes) |
| 6 | Sync API-Football + Cron (live + final) |
| 7–9 | Pages UI (Leaderboard → équipe → joueur → stats) |
