# ⚽ Jeu de l'Entraîneur — PROJECT.md

> Document de référence unique. À fournir en contexte à Claude Code à chaque nouvelle session.

---

## 🎯 Concept

Site web de fantasy football pour la Coupe du Monde 2026 entre amis, appelé **"Jeu de l'Entraîneur"**.  
Chaque participant compose une équipe de 11 joueurs sélectionnés parmi les joueurs qualifiés pour la CdM 2026. Les points sont calculés automatiquement en fonction des performances réelles des joueurs via une API football.

Le site est **public en lecture seule** — pas de compte utilisateur. Tout le monde accède au même site pour suivre le classement et les équipes. Seul l'administrateur a accès à une interface protégée pour saisir et gérer les équipes.

---

## 👥 Participants

- Entre 10 et 20 participants
- Mise d'entrée : **20 € par participant**
- Les équipes sont saisies uniquement par l'administrateur (interface `/admin` protégée)

---

## 📋 Règles de composition d'équipe

- Formation imposée : **1-4-3-3** (1 GK, 4 DEF, 3 MID, 3 FWD)
- **11 joueurs** par équipe
- **Maximum 3 joueurs de la même nationalité** par équipe
- Les joueurs doivent être sélectionnés pour la CdM 2026

---

## 🏆 Système de points

### Résultat collectif (par joueur, selon le résultat de son équipe nationale)
| Résultat | Points |
|----------|--------|
| Victoire | +3 pts |
| Nul | +1 pt |
| Défaite | 0 pt |

### Performances individuelles
| Action | Points |
|--------|--------|
| But — Gardien | +25 pts |
| But — Défenseur | +15 pts |
| But — Milieu | +10 pts |
| But — Attaquant | +5 pts |
| But coup franc direct | +15 pts *(cumulable avec bonus de position)* |
| But sur penalty (hors TAB) | +5 pts *(remplace le bonus de position, non cumulable)* |
| Passe décisive | +3 pts |
| Homme du match | +3 pts |
| Cleansheet — Gardien | +5 pts |
| Penalty arrêté (en jeu ou TAB) | +5 pts |
| Carton rouge | -10 pts |

> **Note sur les buts :**
> - But sur coup franc direct : le joueur reçoit le bonus de position + 15 pts coup franc
> - But sur penalty (hors TAB) : le joueur reçoit uniquement +5 pts (pas le bonus de position)
> - But en TAB : ne rapporte pas de points individuels (seulement les penalties arrêtés)

---

## 🛠️ Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 14 (App Router) |
| Langage | TypeScript |
| Styles | Tailwind CSS |
| Base de données | Supabase (PostgreSQL) |
| Auth admin | Variable d'environnement (mot de passe simple) |
| API Football | API-Football via RapidAPI |
| Déploiement | Vercel |
| Cron jobs | Vercel Cron Functions |
| Charts | Recharts |

---

## 🗄️ Schéma base de données

```sql
-- Participants au jeu
participants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Joueurs CdM 2026
players (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  nationality TEXT NOT NULL,        -- ex: "France", "Brazil"
  nationality_code TEXT NOT NULL,   -- ex: "FR", "BR" (ISO 3166-1 alpha-2)
  position TEXT NOT NULL,           -- GK | DEF | MID | FWD
  photo_url TEXT,
  api_football_id INTEGER UNIQUE    -- ID dans API-Football
)

-- Équipes composées par les participants
teams (
  id UUID PRIMARY KEY,
  participant_id UUID REFERENCES participants(id),
  player_id UUID REFERENCES players(id),
  slot INTEGER NOT NULL             -- 1=GK, 2-5=DEF, 6-8=MID, 9-11=FWD
)

-- Matchs CdM 2026 (calendrier pré-importé + résultats live)
matches (
  id UUID PRIMARY KEY,
  api_match_id INTEGER UNIQUE,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  date TIMESTAMP NOT NULL,
  venue TEXT,                       -- stade + ville hôte
  stage TEXT,                       -- ex: "Groupe A", "Quarts de finale"
  status TEXT DEFAULT 'scheduled'   -- scheduled | live | finished
)

-- Stats individuelles par joueur par match
player_stats (
  id UUID PRIMARY KEY,
  player_id UUID REFERENCES players(id),
  match_id UUID REFERENCES matches(id),
  played BOOLEAN DEFAULT FALSE,
  result TEXT,                      -- win | draw | loss
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  motm BOOLEAN DEFAULT FALSE,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  penalty_saved INTEGER DEFAULT 0,
  penalty_scored INTEGER DEFAULT 0, -- penalties marqués hors TAB
  freekick_goal INTEGER DEFAULT 0,
  cleansheet BOOLEAN DEFAULT FALSE,
  UNIQUE(player_id, match_id)
)

-- Log détaillé des points par participant par match
points_log (
  id UUID PRIMARY KEY,
  participant_id UUID REFERENCES participants(id),
  player_id UUID REFERENCES players(id),
  match_id UUID REFERENCES matches(id),
  points_breakdown JSONB NOT NULL,  -- détail de chaque bonus
  total_points INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
)
```

---

## 📁 Structure du projet

```
jeu-de-lentraineur/
├── PROJECT.md                    ← ce fichier
├── .env.local                    ← variables d'environnement (non commité)
├── .env.example                  ← template des variables
├── scripts/
│   └── seed-matches.ts           ← script one-shot : import calendrier CdM 2026
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  ← Leaderboard (page principale)
│   ├── team/[participantId]/
│   │   └── page.tsx              ← Page équipe d'un participant
│   ├── player/[playerId]/
│   │   └── page.tsx              ← Détail d'un joueur
│   ├── stats/
│   │   └── page.tsx              ← Stats globales + cagnotte
│   ├── admin/
│   │   └── page.tsx              ← Interface admin (protégée)
│   └── api/
│       ├── cron/
│       │   └── sync-stats/
│       │       └── route.ts      ← Cron Vercel (déclenché aux horaires des matchs)
│       └── admin/
│           └── teams/
│               └── route.ts      ← API saisie des équipes
├── lib/
│   ├── supabase.ts               ← Client Supabase
│   ├── scoring.ts                ← Moteur de calcul des points
│   ├── api-football.ts           ← Wrapper API-Football
│   └── types.ts                  ← Types TypeScript globaux
├── components/
│   ├── Leaderboard.tsx
│   ├── FormationView.tsx          ← Vue 4-3-3 visuelle
│   ├── PlayerCard.tsx
│   ├── PointsBadge.tsx
│   └── LiveBadge.tsx
└── vercel.json                   ← Config crons
```

---

## 🔑 Variables d'environnement

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# API Football (RapidAPI)
RAPIDAPI_KEY=
RAPIDAPI_HOST=api-football-v1.p.rapidapi.com

# Admin
ADMIN_PASSWORD=

# Vercel Cron (secret pour sécuriser l'endpoint)
CRON_SECRET=
```

---

## 🔄 Flux de données

```
                  ┌─ seed-matches.ts (one-shot avant la CdM)
                  │   → importe les 104 matchs + horaires en base
API-Football ─────┤
                  └─ Vercel Cron (déclenché uniquement aux horaires des matchs)
                      │
                      ├── fetchLiveStats()            → player_stats (live)
                      ├── fetchFinalStats()           → player_stats (final)
                      ├── calculatePoints()           → scoring.ts
                      └── updatePointsLog()           → points_log + participants.total_points
```

**Stratégie cron :** le cron tourne toutes les 5 minutes uniquement s'il y a un match `status = 'live'` en base. Sinon, il vérifie toutes les heures si un match doit passer en `live`. Pas de fetch inutile à 3h du matin.

---

## 📐 Pages & fonctionnalités

### `/` — Leaderboard
- Classement complet avec rang, nom, points totaux
- Évolution vs la veille (+/- pts)
- Podium top 3 mis en avant
- Prochains matchs à venir (depuis le calendrier pré-importé)
- Mise à jour automatique

### `/team/[participantId]` — Page équipe
- Formation 4-3-3 visuelle
- Photo + drapeau de chaque joueur
- Points totaux par joueur
- Badge LIVE si joueur en match en cours

### `/player/[playerId]` — Détail joueur
- Historique match par match
- Points breakdown détaillé par match
- Graphe d'évolution (Recharts)

### `/stats` — Stats globales
- Meilleur buteur, passeur, joueur le plus rentable
- Tracker cagnotte (total misé + répartition configurable)
- Records (joueur le plus actif, etc.)

### `/admin` — Interface admin (protégée par mot de passe)
- Saisie des équipes des participants
- Recherche de joueurs
- Validation automatique : max 3 même nationalité, formation 4-3-3
- Vue récap avant validation

---

## 🎨 Direction visuelle

Deux thèmes proposés — à choisir après validation du design avec Claude Design.

### Option A — FIFA 2026 Officiel
Inspiré de l'identité visuelle officielle de la CdM 2026 (noir/blanc + trophée doré + vert).

| Rôle | Couleur | Hex |
|------|---------|-----|
| Background principal | Noir profond | `#0A0A0A` |
| Surface | Gris très sombre | `#141414` |
| Accent trophée | Or | `#C9A84C` |
| Accent vert (buts, +pts) | Vert FIFA | `#3CAC3B` |
| Danger (cartons, -pts) | Rouge | `#E61D25` |
| Texte principal | Blanc | `#FFFFFF` |
| Texte secondaire | Gris clair | `#A0A0A0` |

### Option B — Dark Premium ESPN-style
Dark mode premium avec accent cuivré, inspiré ESPN/FIFA Ultimate Team.

| Rôle | Couleur | Hex |
|------|---------|-----|
| Background principal | Noir nuit | `#0D0D0D` |
| Surface | Ardoise sombre | `#1A1F2E` |
| Accent podium | Cuivre/Or | `#D4A843` |
| Accent positif | Vert vif | `#00C853` |
| Danger | Rouge vif | `#FF1744` |
| Texte principal | Blanc cassé | `#F0F0F0` |
| Texte secondaire | Bleu-gris | `#8899AA` |

> **Typographie (commune aux deux options)** : display bold pour les chiffres et classements, sans-serif lisible pour les données de joueurs. Suggestion : `Inter` ou `Outfit` pour le corps, `Bebas Neue` ou `Barlow Condensed` pour les grands chiffres.

---

## 📅 Ordre de développement

1. `PROJECT.md` ✅
2. Validation du design avec Claude Design (Option A / Option B)
3. Init projet Next.js + Supabase schema
4. Script `seed-matches.ts` (import calendrier CdM 2026)
5. Moteur de scoring (`scoring.ts`) + tests
6. Interface admin (saisie des équipes)
7. Sync API Football + Cron (live + final)
8. Pages UI (Leaderboard → équipe → joueur → stats)
9. Features bonus (LIVE badge, graphes, cagnotte)
