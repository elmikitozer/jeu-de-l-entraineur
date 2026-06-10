/** Génère une teinte HSL stable depuis le nom (0-359). */
function nameToHue(name: string): number {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
}

interface Props {
  name: string
  size?: number
  onColor?: boolean
  ring?: boolean
  className?: string
}

export default function Avatar({ name, size = 40, onColor = false, ring = false, className = '' }: Props) {
  const hue = nameToHue(name)
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .replace('.', '')
    .slice(0, 2)
    .toUpperCase()

  const bg = onColor
    ? 'rgba(255,255,255,0.22)'
    : `oklch(var(--av-bg-l, 0.88) var(--av-bg-c, 0.06) ${hue})`
  const color = onColor
    ? '#FFFFFF'
    : `oklch(var(--av-fg-l, 0.40) var(--av-fg-c, 0.10) ${hue})`
  const border = onColor
    ? '2px solid rgba(255,255,255,0.5)'
    : ring
    ? '2.5px solid rgba(255,255,255,0.9)'
    : 'none'
  const boxShadow = ring ? '0 4px 10px rgba(0,0,0,0.3)' : undefined

  return (
    <div
      className={`flex-shrink-0 flex items-center justify-center font-display font-bold ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: bg,
        color,
        border,
        boxShadow,
        fontSize: size * 0.36,
      }}
    >
      {initials}
    </div>
  )
}
