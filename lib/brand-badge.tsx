/**
 * Badge "JE" rendu par next/og (Satori) pour les icônes générées (favicon,
 * apple-touch-icon, icônes du manifest PWA). Lime plein cadre + "JE" centré,
 * dimensionné pour rester dans la zone sûre (masquage iOS / maskable Android).
 */
export const ICON_BG = '#C8F542'
export const ICON_FG = '#07261B'

export function BrandBadge({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: ICON_BG,
        color: ICON_FG,
        fontSize: Math.round(size * 0.42),
        fontWeight: 800,
        fontFamily: 'sans-serif',
      }}
    >
      JE
    </div>
  )
}
