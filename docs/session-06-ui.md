# Session 06 — UI Publique Complète

## Fichiers créés / modifiés

| Fichier | Action | Rôle |
|---------|--------|------|
| `tailwind.config.ts` | Modifié | `darkMode: 'class'` + polices display/body + couleurs CSS-var |
| `app/globals.css` | Remplacé | Design tokens complets light/dark, variables pitch, scrollbar |
| `app/layout.tsx` | Remplacé | Google Fonts, Navbar sticky, TriStripe, Footer, dark mode init |
| `lib/queries.ts` | Créé | Toutes les fonctions Supabase publiques |
| `components/TriStripe.tsx` | Créé | Bande tricolore vert/bleu/rouge |
| `components/Delta.tsx` | Créé | Badge delta +/- pts avec couleur contextuelle |
| `components/Avatar.tsx` | Créé | Cercle initiales avec teinte oklch dérivée du nom |
| `components/PodiumCard.tsx` | Créé | Carte podium colorée (1=vert, 2=bleu, 3=rouge) |
| `components/MatchCard.tsx` | Créé | Carte match avec top border colorée alternée |
| `components/FormationView.tsx` | Remplacé | Terrain SVG 4-3-3 avec bandes pelouse et marquages |
| `components/PitchPlayer.tsx` | Créé | Joueur sur le terrain (avatar ring + badge nom/pays + pts) |
| `components/LiveBadge.tsx` | Remplacé | Badge LIVE animé (pulse) |
| `components/PointsBadge.tsx` | Remplacé | Badge points coloré (variant white pour terrain) |
| `components/DarkModeToggle.tsx` | Créé | Toggle dark/light avec icône soleil/lune |
| `components/FooterUpdatedAt.tsx` | Créé | Timer client "Mis à jour il y a X min" |
| `components/PlayerHistoryClient.tsx` | Créé | Client Component : chart Recharts + tableau historique dépliable |
| `app/page.tsx` | Remplacé | Leaderboard complet (héro, podium 2-1-3, tableau, matchs) |
| `app/team/[participantId]/page.tsx` | Remplacé | Page équipe avec terrain SVG + roster sidebar |
| `app/player/[playerId]/page.tsx` | Remplacé | Détail joueur + graphe évolution + historique dépliable |
| `app/stats/page.tsx` | Remplacé | Stats & cagnotte avec tracker 60/30/10 |
| `docs/session-06-ui.md` | Créé | Ce fichier |

---

## Architecture

### Système de thème

- `darkMode: 'class'` dans Tailwind — le mode sombre est activé via la classe `.dark` sur `<html>`
- Variables CSS dans `globals.css` : `:root` (light) + `.dark` (dark)
- Script inline dans `<head>` pour lire `localStorage.theme` avant hydration → pas de flash
- `DarkModeToggle` (Client Component) toggle la classe et persiste en localStorage

### Design tokens

```css
/* Light */
--c-bg, --c-card, --c-ink, --c-sub, --c-line,
--c-green, --c-blue, --c-red,
--c-delta-pos, --c-delta-neg, --c-zebra,
--c-podium1 (#0E7C3F), --c-podium2 (#1D4ED8), --c-podium3 (#D7263D)
--pitch-a, --pitch-b, --pitch-line

/* Dark (switch automatique via .dark sur <html>) */
/* Podiums avec gradient dans le dark mode via style="..." inline */
```

### Polices

```typescript
// next/font/google — variables CSS sur <html>
--font-display: Barlow Condensed 700 (normal + italic)
--font-body:    Outfit 400 + 600
```

### Data fetching

Toutes les pages sont Server Components avec `export const revalidate = 60`.
`lib/queries.ts` utilise `createClient` sans generic (pattern projet) avec la clé anon publique.

### Terrain SVG

Le terrain utilise `repeating-linear-gradient(180deg, var(--pitch-a) 0px 90px, var(--pitch-b) 90px 180px)` pour les bandes alternées, avec les marquages positionnés en `position: absolute` via CSS.

---

## ⚠️ Décisions prises

- **Avatar teinte oklch** : `nameToHue()` génère une teinte 0-359 depuis le nom (hash `h = h*31 + charCode`). Les variables `--av-bg-l`, `--av-bg-c`, `--av-fg-l`, `--av-fg-c` gèrent les niveaux light/dark.
- **Podium dark mode gradient** : implémenté via un bloc `<style>` inline dans `PodiumCard.tsx` (`html.dark [data-podium="X"]`) pour que le gradient s'applique sans `dark:` Tailwind (les valeurs de gradient ne peuvent pas être des CSS vars simples).
- **Delta "vs hier"** : calculé depuis `points_log.created_at > NOW() - 24h`. Si aucun log récent, delta = 0.
- **PlayerHistoryClient** : Client Component nécessaire pour Recharts (API browser) + lignes dépliables (useState). Le Server Component parent fetch les données et les passe en props.
- **FormationView** : les bandes pelouse et marquages terrain sont en CSS pur (repeating-gradient + divs absolus), pas de SVG — plus simple et plus responsive.
- **Recharts Tooltip** : le `formatter` type est large (`ValueType | undefined`), on laisse l'inférence pour éviter l'erreur TS.

## ❌ Ce qui n'a pas pu être fait

- **Page `/calendrier`** : lien présent dans la nav, mais la page n'existe pas (hors scope session 06)
- **Page `/equipes`** : listing de tous les participants (hors scope session 06 — la nav ne le liste pas non plus)
- **Mobile podium** : podium en colonne sur mobile (implémenté), mais le test visuel sur device réel est à faire
- **Animation LIVE** : le badge pulse via CSS `animate-pulse` de Tailwind. Si le CustomAnimation n'est pas correctement configuré, remplacer par une classe CSS directe.

## 🔜 Prérequis avant Session 07 (Deploy + Mapping IDs)

1. **Déployer sur Vercel** :
   - `vercel deploy` ou push sur branche → déploiement auto
   - Configurer les env vars Vercel : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `CRON_SECRET`
   - URL de prod → configurer `VERCEL_PROJECT_URL` dans les secrets GitHub Actions

2. **Appliquer la migration** `supabase/migrations/001_add_verified_at.sql` (si pas encore fait)

3. **Mapper les `api_football_id`** des joueurs seedés

4. **Mapper les `api_match_id`** des matchs (IDs Kaggle ≠ IDs API-Football)

5. **Session 07** = Deploy Vercel production + script de mapping des IDs API-Football
