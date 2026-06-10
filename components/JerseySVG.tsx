/**
 * JerseySVG — Maillot de football dessiné en SVG pur.
 * Couleurs issues de TEAM_COLORS (lib/flags.ts).
 * Taille : sm = 36px de large, md = 54px de large.
 */

interface Props {
  /** Couleur dominante du maillot */
  primary: string
  /** Couleur du col / bandes */
  secondary: string
  /** 1-2 initiales affichées au centre du maillot */
  initials: string
  /** Nom du joueur, tronqué à 12 caractères, affiché sous le maillot */
  label: string
  /** Nom affiché sur mobile uniquement (ex. : nom de famille seul) */
  mobileLabel?: string
  size?: 'sm' | 'md'
  /** Contenu du tooltip natif (title HTML) */
  title?: string
}

const SIZES = {
  sm: { w: 36, labelSize: 8.5 },
  md: { w: 54, labelSize: 11 },
}

// Chemin SVG du maillot dans un repère 60×70 :
//   épaules en (12,8) et (48,8), manches jusqu'aux bords x=0 et x=60,
//   corps légèrement évasé vers le bas (x=9→51), col en V jusqu'à y=24.
const BODY_PATH =
  'M12,8 L0,22 L0,30 L12,28 L9,64 L51,64 L48,28 L60,30 L60,22 L48,8 C42,8 33,24 30,24 C27,24 18,8 12,8 Z'
const COLLAR_PATH = 'M12,8 C18,8 27,24 30,24 C33,24 42,8 48,8'

export default function JerseySVG({
  primary,
  secondary,
  initials,
  label,
  mobileLabel,
  size = 'sm',
  title,
}: Props) {
  const { w, labelSize } = SIZES[size]
  // Maintien du ratio viewBox 60:70
  const h = Math.round(w * 70 / 60)

  return (
    <div
      className="flex flex-col items-center"
      style={{ width: w, gap: 2 }}
      title={title}
    >
      <svg
        viewBox="0 0 60 70"
        width={w}
        height={h}
        aria-hidden="true"
        overflow="visible"
      >
        {/* Corps du maillot */}
        <path d={BODY_PATH} fill={primary} />

        {/* Col en V dans la couleur secondaire */}
        <path
          d={COLLAR_PATH}
          fill="none"
          stroke={secondary}
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Bandes de manchettes */}
        <line x1="0" y1="28.5" x2="12" y2="27.5" stroke={secondary} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="48" y1="27.5" x2="60" y2="28.5" stroke={secondary} strokeWidth="2.5" strokeLinecap="round" />

        {/* Initiales — texte blanc avec contour sombre (lisible sur toute couleur) */}
        <text
          x="30"
          y="49"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          stroke="rgba(0,0,0,0.65)"
          strokeWidth="2.5"
          paintOrder="stroke"
          fontSize="15"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {initials}
        </text>
      </svg>

      {/* Nom tronqué — mobile : mobileLabel si fourni, desktop : label complet */}
      {(() => {
        const s = {
          fontSize: labelSize,
          fontWeight: 600,
          color: 'white',
          maxWidth: w,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap' as const,
          textAlign: 'center' as const,
          lineHeight: 1.2,
          textShadow: '0 1px 3px rgba(0,0,0,0.7)',
          fontFamily: 'var(--font-body, system-ui, sans-serif)',
        }
        return mobileLabel ? (
          <>
            <span className="block md:hidden" style={s}>{mobileLabel.slice(0, 10)}</span>
            <span className="hidden md:block" style={s}>{label.slice(0, 12)}</span>
          </>
        ) : (
          <span className="block" style={s}>{label.slice(0, 12)}</span>
        )
      })()}
    </div>
  )
}
