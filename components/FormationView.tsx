import Link from 'next/link'
import type { TeamLine } from '@/lib/queries'
import PitchPlayer from './PitchPlayer'

interface Props {
  lines: TeamLine[]
}

export default function FormationView({ lines }: Props) {
  // Ordre d'affichage : Attaque (haut) → Milieu → Défense → Gardien (bas)
  const ORDER: TeamLine['label'][] = ['Attaque', 'Milieu', 'Défense', 'Gardien']
  const sortedLines = ORDER.map((label) => lines.find((l) => l.label === label)).filter(Boolean) as TeamLine[]

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-line flex flex-col justify-between min-h-[460px] md:min-h-[680px]"
      style={{
        background: 'repeating-linear-gradient(180deg, var(--pitch-a) 0px 90px, var(--pitch-b) 90px 180px)',
        padding: '28px 16px 24px',
      }}
    >
      {/* ── Marquages terrain ── */}
      <div
        className="absolute pointer-events-none rounded-lg"
        style={{ inset: 18, border: '2px solid var(--pitch-line)' }}
      />
      <div
        className="absolute pointer-events-none"
        style={{ left: 18, right: 18, top: '50%', height: 2, background: 'var(--pitch-line)' }}
      />
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          left: '50%', top: '50%',
          width: 120, height: 120,
          border: '2px solid var(--pitch-line)',
          transform: 'translate(-50%, -50%)',
        }}
      />
      {/* Surface haute */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '50%', top: 18,
          width: 240, height: 86,
          border: '2px solid var(--pitch-line)',
          borderTop: 'none',
          transform: 'translateX(-50%)',
        }}
      />
      {/* Surface basse */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '50%', bottom: 18,
          width: 240, height: 86,
          border: '2px solid var(--pitch-line)',
          borderBottom: 'none',
          transform: 'translateX(-50%)',
        }}
      />

      {/* ── Lignes de joueurs ── */}
      {sortedLines.map((line) => (
        <div
          key={line.label}
          className="flex justify-evenly relative z-10"
          style={{
            padding: `0 ${line.players.length === 4 ? 0 : 20}px`,
          }}
        >
          {line.players.map((player) => (
            <Link
              key={player.id}
              href={`/players/${player.id}`}
              aria-label={player.name}
              className="cursor-pointer transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              <PitchPlayer
                name={player.name}
                nationality={player.nationality}
                photoUrl={player.photo_url}
                points={player.points}
                isLive={player.isLive}
              />
            </Link>
          ))}
        </div>
      ))}
    </div>
  )
}
