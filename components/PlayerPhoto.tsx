import Avatar from '@/components/Avatar'

interface Props {
  name: string
  photoUrl: string | null
  size?: number
  /** Couleur de fond derrière la photo (drapeau/maillot). Défaut : carte. */
  bg?: string
  className?: string
}

/**
 * Photo d'un joueur (API-Football) avec repli sur un avatar d'initiales.
 * Cadrage "top" pour garder le visage visible sur les portraits.
 */
export default function PlayerPhoto({ name, photoUrl, size = 72, bg, className = '' }: Props) {
  if (!photoUrl) {
    return <Avatar name={name} size={size} className={className} />
  }
  return (
    <div
      className={`flex-shrink-0 overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: 16,
        background: bg ?? 'var(--c-card)',
        border: '1px solid var(--c-line)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl}
        alt={name}
        width={size}
        height={size}
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
      />
    </div>
  )
}
