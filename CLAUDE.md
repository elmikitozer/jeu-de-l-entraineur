# Jeu de l'entraineur

Fantasy football — Coupe du Monde 2026. Stack Next.js (App Router) + Supabase.

## Health Stack

- typecheck: npx tsc --noEmit
- lint: npx next lint
- test: npx vitest run
- deadcode: npx knip

## Sessions reportées

Idées validées, à implémenter dans une prochaine session :

- **Tête-à-tête entre équipes** — comparaison 1v1 (joueurs communs, différentiel de points, qui a marqué quoi). Données déjà disponibles via `getAllParticipantsWithTeams`.
- **Classement par journée** — classement non cumulé (gains du jour), dérivé de `points_log.created_at`. Le delta 24h de `getLeaderboard` est déjà la brique de base.
- **Cache `unstable_cache`** — mettre en cache les requêtes lourdes (`getGlobalStats`, `getAllParticipantsWithTeams` qui scannent toutes les tables) avec invalidation par tag. À évaluer **après les 8es** selon le lag réel observé sous charge.
- **Barlow Condensed italic dans l'og-image** — `/api/og/classement` utilise la police système (v1) ; charger Barlow en `ArrayBuffer` et le passer à `ImageResponse({ fonts })` pour matcher la DA "Pelouse Nocturne".

## Gotchas projet

- **Conventions de fichiers métadonnées Next** (`app/icon.tsx`, `app/manifest.ts`, `app/opengraph-image.tsx`) **ne buildent pas** : le `next-metadata-route-loader` embarque le chemin absolu du projet sans échapper l'apostrophe de `Jeu de l'entraineur` → `SyntaxError`. Toujours passer par des route handlers `/api/*` + liens manuels dans `metadata`.
- **`package-lock.json`** a déjà été corrompu (retour-ligne injecté dans le champ `version`) → erreurs `Bad control character in JSON` au build. Si ça réapparaît : `git checkout -- package-lock.json`.
