import { getFlagUrl } from '@/lib/flags'

interface FlagProps {
  teamName: string
  size?: '16x12' | '24x18' | '40x30'
  className?: string
}

export default function Flag({ teamName, size = '24x18', className = '' }: FlagProps) {
  const url = getFlagUrl(teamName, size)
  if (!url) return null

  const [w, h] = size.split('x').map(Number)

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={teamName}
      width={w}
      height={h}
      className={`inline-block flex-shrink-0 rounded-[2px] ${className}`}
      style={{ objectFit: 'cover' }}
    />
  )
}
