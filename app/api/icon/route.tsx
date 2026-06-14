import { ImageResponse } from 'next/og'
import { BrandBadge } from '@/lib/brand-badge'

// Route handler plutôt que la convention app/icon.tsx : le loader de métadonnées
// de Next embarque le chemin absolu du fichier dans du code généré sans échapper
// les apostrophes — or le dossier du projet contient « l'entraineur » → build cassé.
// Les route handlers n'utilisent pas ce loader.
export const runtime = 'nodejs'

export function GET() {
  return new ImageResponse(<BrandBadge size={512} />, { width: 512, height: 512 })
}
