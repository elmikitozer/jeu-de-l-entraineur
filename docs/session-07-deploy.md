# Session 07 — Deploy Vercel + Fixes + Mapping IDs

## Résumé

Session de stabilisation : corrections bugs, animation menu, scripts de mapping API-Football, et guide de déploiement Vercel.

---

## Fixes réalisés

### Fix 1 — Calendrier vide (0 matchs affichés)

**Root cause** : `getClient()` dans `lib/queries.ts` utilisait `NEXT_PUBLIC_SUPABASE_ANON_KEY` qui était absent ou incorrect dans `.env.local`.

**Fix** : `getClient()` préfère maintenant `SUPABASE_SERVICE_ROLE_KEY` (server-side uniquement, bypasse RLS).

```typescript
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

`getAllMatches()` log maintenant les erreurs Supabase pour faciliter le debug.

---

### Fix 2 — Animation menu mobile burger

**Objectif** : le dropdown glisse depuis sous la navbar (translateY -100% → 0, 200ms).

**Ajout dans `app/globals.css`** :
```css
@keyframes slide-down {
  from { transform: translateY(-100%); opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
}
.animate-slide-down {
  animation: slide-down 200ms ease-out forwards;
  overflow: hidden;
}
```

**Modification de `components/MobileMenu.tsx`** :
- Dropdown positionné `fixed` à `top: 69px` (hauteur header : nav 64px + TriStripe 5px)
- `z-40` (sous le header `z-50`) → l'animation commence cachée derrière la navbar
- Classe `animate-slide-down` sur le div dropdown

---

### Fix 3 — Script `scripts/map-match-ids.ts`

Mappe les `api_match_id` Supabase (IDs Kaggle 1-104) vers les vrais IDs API-Football.

**Fonctionnement** :
1. Fetch GET `/fixtures?league=1&season=2026` (header `x-apisports-key`)
2. Pour chaque fixture : cherche en base par `home_team ≈ teams.home.name` (insensible accents/casse) + date ±1 jour
3. Met à jour `matches.api_match_id`
4. Idempotent : skip si `api_match_id` déjà correct

**Lancement** :
```bash
npx tsx scripts/map-match-ids.ts
```

**Output attendu** :
```
🌐 Fetch des fixtures CdM 2026 depuis API-Football...
   → 104 fixtures reçus
   → 104 matchs en base
   ✅ France vs Maroc → api_match_id=1234567
   ...

📊 Résumé :
   ✅ 102 matchs mappés
   ↩️  0 déjà mappés (inchangés)
   ❌ 2 fixtures non trouvés en base :
      - United States vs...
```

---

### Fix 4 — Script `scripts/map-player-ids.ts`

Mappe `api_football_id` pour tous les joueurs sans ID.

**Fonctionnement** :
1. Charge tous les joueurs avec `api_football_id = null`
2. Pour chaque joueur : GET `/players?name={nom}&season=2026`
3. Score de correspondance : nom exact (+100) / partiel (+60) / prénom+nom (+50), nationalité (+30/15)
4. Accepte si score ≥ 50, sinon → à mapper manuellement
5. Vérifie les conflits (même `api_football_id` pour deux joueurs différents)
6. Rate limiting : 600ms entre chaque appel

**Lancement** :
```bash
npx tsx scripts/map-player-ids.ts
```

> ⚠️ Sur le plan gratuit API-Football : ~100 req/jour. Pour ~450 joueurs, lancer en plusieurs fois ou upgrade le plan.

---

## TypeScript

`npx tsc --noEmit` → 0 erreur.

---

## Fichiers modifiés / créés

| Fichier | Action |
|---|---|
| `lib/queries.ts` | Fix getClient() + log erreurs getAllMatches() |
| `app/globals.css` | Ajout @keyframes slide-down + .animate-slide-down |
| `components/MobileMenu.tsx` | Position fixed top:69px, z-40, animate-slide-down |
| `scripts/map-match-ids.ts` | Nouveau script |
| `scripts/map-player-ids.ts` | Nouveau script |
| `docs/deploy-vercel.md` | Nouveau guide |
| `docs/session-07-deploy.md` | Ce fichier |

---

## Ordre de déploiement recommandé

1. `npx tsx scripts/map-match-ids.ts` — mapper les IDs de matchs
2. `npx tsx scripts/map-player-ids.ts` — mapper les IDs joueurs (peut prendre ~5 min)
3. Corriger manuellement dans Supabase les joueurs non trouvés
4. Push sur GitHub → Vercel déploie automatiquement
5. Vérifier en production : `/`, `/calendrier`, `/stats`
6. Configurer le cron job (voir `docs/deploy-vercel.md`)
