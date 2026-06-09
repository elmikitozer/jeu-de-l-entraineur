# Session 04 — Interface Admin

## Fichiers créés / modifiés

| Fichier | Action | Rôle |
|---------|--------|------|
| `middleware.ts` | Créé | Protège `/admin/*` et `/api/admin/*` avec cookie `admin_token` |
| `app/admin/login/page.tsx` | Créé | Page de connexion avec Server Action (cookie httpOnly) |
| `app/admin/page.tsx` | Implémenté | Interface de saisie des équipes (Client Component) |
| `app/api/admin/logout/route.ts` | Créé | POST → efface le cookie et redirige vers /admin/login |
| `app/api/admin/players/route.ts` | Créé | GET → liste tous les joueurs triés par position/nom |
| `app/api/admin/teams/route.ts` | Implémenté | GET → participants avec équipes · POST → upsert équipe validée |
| `components/admin/PlayerSearch.tsx` | Créé | Combobox de recherche de joueur par position |
| `components/admin/FormationPreview.tsx` | Créé | Visualisation terrain 4-3-3 |
| `components/admin/ParticipantList.tsx` | Créé | Sidebar liste des participants avec statut de complétion |
| `docs/session-04-admin.md` | Créé | Ce fichier |

## Architecture

### Flux d'authentification

```
[Browser] GET /admin
  → middleware.ts : cookie admin_token absent ?
    → oui : redirect /admin/login
    → non (valeur = ADMIN_PASSWORD) : pass

[Browser] POST /admin/login (Server Action)
  → compare password avec process.env.ADMIN_PASSWORD
  → succès : set cookie httpOnly admin_token, redirect /admin
  → échec : redirect /admin/login?error=1
```

### Sécurité

- Cookie `admin_token` : httpOnly, sameSite strict, secure en production, TTL 7 jours
- La valeur du cookie **est** le mot de passe (hashing non implémenté — outil privé)
- `SUPABASE_SERVICE_ROLE_KEY` uniquement côté serveur (API routes) — jamais exposé au browser
- Le middleware protège aussi `/api/admin/*` → retourne 401 si cookie absent/invalide

### Flux de données (admin page)

```
app/admin/page.tsx (Client Component)
  ├─ useEffect → GET /api/admin/players → state: players[]
  ├─ useEffect → GET /api/admin/teams   → state: participants[]
  │
  ├─ ParticipantList (sidebar)
  │   └─ clic participant → dispatch LOAD → remplit le formulaire
  │
  ├─ Formulaire (useReducer)
  │   ├─ SET_NAME : nom du participant
  │   ├─ SET_PLAYER : sélection joueur par slot
  │   └─ RESET : vide le formulaire
  │
  ├─ PlayerSearch × 11 : combobox filtrée par position
  ├─ FormationPreview : visualisation terrain
  └─ handleSubmit → POST /api/admin/teams → loadData() → RESET
```

### POST /api/admin/teams — validations (dans l'ordre)

1. `participant_name` non vide
2. Exactement 11 slots (1 à 11, sans doublon de numéro)
3. Pas de `player_id` dupliqué
4. Fetch des 11 joueurs en DB (vérifie leur existence)
5. Chaque slot respecte la formation 4-3-3 :
   - Slot 1 → GK
   - Slots 2-5 → DEF
   - Slots 6-8 → MID
   - Slots 9-11 → FWD
6. Max 3 joueurs de la même nationalité
7. Upsert participant (créé si nouveau)
8. DELETE + INSERT de l'équipe (remplacement complet)

## Composants admin

### `PlayerSearch`
- Props : `slot`, `position`, `players`, `value`, `onChange`, `disabledIds`
- Filtre les joueurs par position et texte de recherche
- `disabledIds` : Set des player_ids déjà sélectionnés ailleurs (affichés grisés)
- Gestion click-outside pour fermer le dropdown

### `FormationPreview`
- Props : `selections: Record<number, Player | null>`
- Affiche le terrain 4-3-3 avec code de nationalité + nom (dernière partie)
- Cercles verts si joueur présent, gris sinon

### `ParticipantList`
- Props : `participants`, `onSelect`, `selectedId`
- Affiche le statut X/11 par participant (vert si complet, orange sinon)
- Bouton actif mis en doré (`#C9A84C`)

## Variables d'environnement requises

| Variable | Usage |
|----------|-------|
| `ADMIN_PASSWORD` | Comparé au formulaire de login et au cookie |
| `NEXT_PUBLIC_SUPABASE_URL` | Tous les clients Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | API routes admin (bypass RLS) |

## Prérequis avant Session 05

1. `.env.local` avec `ADMIN_PASSWORD` défini
2. Schéma Supabase appliqué (`supabase/schema.sql`)
3. Seeds exécutés (`npm run seed:matches && npm run seed:players`)
4. Tester le flow complet :
   - Accéder à `/admin` → redirigé vers `/admin/login`
   - Se connecter avec le bon mot de passe
   - Créer une équipe pour un participant
   - Vérifier dans Supabase Dashboard (tables `participants` + `teams`)
   - Modifier l'équipe → vérifier que les slots sont remplacés
5. Session 05 = **Leaderboard & pages publiques**
