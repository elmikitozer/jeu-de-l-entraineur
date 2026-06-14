// Manifest PWA servi via route handler (la convention app/manifest.ts déclenche
// le loader de métadonnées qui casse à cause de l'apostrophe du chemin projet).
// Lié depuis app/layout.tsx via metadata.manifest = '/api/manifest'.
export function GET() {
  return Response.json(
    {
      name: "Jeu de l'Entraîneur — CdM 2026",
      short_name: "Jeu de l'Entraîneur",
      description: 'Fantasy football entre amis pour la Coupe du Monde 2026.',
      start_url: '/',
      display: 'standalone',
      background_color: '#093623',
      theme_color: '#093623',
      icons: [
        { src: '/api/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/api/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    { headers: { 'content-type': 'application/manifest+json' } }
  )
}
