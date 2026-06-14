import { ImageResponse } from 'next/og'
import { BrandBadge } from '@/lib/brand-badge'

// Voir app/api/icon/route.tsx pour la raison du route handler (apostrophe dans le
// chemin du projet qui casse le loader de la convention apple-icon.tsx).
export const runtime = 'nodejs'

export function GET() {
  return new ImageResponse(<BrandBadge size={180} />, { width: 180, height: 180 })
}
