# Session 01 — Initialisation du projet

## Fichiers créés

| Fichier | Rôle |
|---------|------|
| `package.json` | Dépendances Next.js 14, Supabase, Recharts, date-fns |
| `tsconfig.json` | TypeScript strict + paths aliases (@/*, @/lib/*, @/components/*, @/app/*) |
| `.env.example` | Template des 7 variables d'environnement requises |
| `vercel.json` | Config cron Vercel (sync-stats toutes les 5 min) |
| `README.md` | Guide de setup local complet |
| `lib/types.ts` | Interfaces TypeScript : Participant, Player, Team, Match, PlayerStats, PointsLog, PointsBreakdown + types utilitaires |
| `lib/supabase.ts` | Clients Supabase : createClient() (browser), createServerClient() (SSR), createAdminClient() (service role) |
| `lib/scoring.ts` | Placeholder — moteur de calcul des points (Session 5) |
| `lib/api-football.ts` | Placeholder — wrapper API-Football (Session 7) |
| `supabase/schema.sql` | Schéma SQL complet : 6 tables, contraintes, index, RLS désactivé |
| `app/layout.tsx` | Layout racine avec Inter, fond noir (#0A0A0A), métadonnées FR |
| `app/page.tsx` | Placeholder leaderboard (Session 8) |
| `app/team/[participantId]/page.tsx` | Placeholder page équipe (Session 8) |
| `app/player/[playerId]/page.tsx` | Placeholder page joueur (Session 8) |
| `app/stats/page.tsx` | Placeholder page stats (Session 8) |
| `app/admin/page.tsx` | Placeholder interface admin (Session 6) |
| `app/api/cron/sync-stats/route.ts` | Endpoint cron avec auth Bearer CRON_SECRET (Session 7) |
| `app/api/admin/teams/route.ts` | Endpoint saisie équipes avec auth x-admin-password (Session 6) |
| `components/Leaderboard.tsx` | Placeholder (Session 8) |
| `components/FormationView.tsx` | Placeholder (Session 8) |
| `components/PlayerCard.tsx` | Placeholder (Session 8) |
| `components/PointsBadge.tsx` | Placeholder (Session 8) |
| `components/LiveBadge.tsx` | Placeholder (Session 9) |
| `scripts/seed-matches.ts` | Placeholder script import calendrier CdM 2026 (Session 3) |
| `docs/session-01-init.md` | Ce fichier |

## Décisions techniques

### Typage Supabase manuel vs généré
Le type `Database` dans `lib/supabase.ts` est écrit manuellement pour cette session. En production, il sera remplacé par le type généré automatiquement via :
```bash
npx supabase gen types typescript --project-id <project-ref> > lib/database.types.ts
```
Avantage : zéro dépendance CLI Supabase pour démarrer.

### `createAdminClient()` avec service role
Ajout d'un troisième client avec `SUPABASE_SERVICE_ROLE_KEY` pour les Route Handlers admin qui ont besoin de bypasser les politiques RLS (même si RLS est désactivé pour l'instant, c'est la bonne pratique pour les opérations d'écriture).

### Police Inter (Google Fonts) vs Geist (local)
Remplacement de Geist (local, chargée depuis le dossier `/app/fonts/`) par Inter (Google Fonts via `next/font/google`) car Inter est plus répandue, sans WOFF bundlé dans le repo, et correspondant mieux à la direction visuelle du PROJECT.md.

### Cron toutes les 5 min (vercel.json)
Le cron est configuré sur `*/5 * * * *` dans vercel.json. La logique "ne pas fetch si pas de match live" sera implémentée dans le handler (Session 7) — Vercel ne supporte pas les crons conditionnels nativement.

### RLS désactivé sur toutes les tables
Conforme au PROJECT.md : "site public en lecture seule, pas d'auth utilisateur". La sécurité des writes est assurée côté application (ADMIN_PASSWORD + CRON_SECRET).

### PointsBreakdown : séparation goal_position / goal_freekick / goal_penalty
Trois champs distincts pour modéliser les trois cas de but du PROJECT.md :
- But normal → `goal_position_bonus` (montant selon position)
- But sur coup franc → `goal_position_bonus` + `goal_freekick_bonus` (+15)
- But sur penalty hors TAB → uniquement `goal_penalty_bonus` (+5)

## Commandes de setup local

```bash
# 1. Cloner le dépôt (ou utiliser le dossier existant)
# 2. Installer les dépendances
npm install

# 3. Copier et remplir les variables d'environnement
cp .env.example .env.local

# 4. Appliquer le schéma dans Supabase SQL Editor
#    → Copier/coller supabase/schema.sql et exécuter

# 5. Lancer le serveur de développement
npm run dev

# 6. Vérifier la compilation production
npm run build
```

## Prérequis avant la Session 02

1. **Créer un projet Supabase** sur [app.supabase.com](https://app.supabase.com) et récupérer les 3 clés API
2. **Remplir `.env.local`** avec toutes les variables (voir README.md)
3. **Exécuter `supabase/schema.sql`** dans le SQL Editor de Supabase
4. **S'abonner à API-Football** sur RapidAPI et noter la clé
5. **Choisir le thème visuel** (Option A FIFA officiel ou Option B ESPN-style) — voir PROJECT.md section "Direction visuelle"
6. Vérifier que `npm run build` passe sans erreur
