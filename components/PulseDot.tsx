export default function PulseDot() {
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-block',
        width: 12,
        height: 12,
        flexShrink: 0,
      }}
    >
      {/* Ring animé */}
      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'rgba(34, 197, 94, 0.40)',
          animation: 'pulse-ring 1.5s ease-out infinite',
          transformOrigin: 'center',
        }}
      />
      {/* Dot solide */}
      <span
        style={{
          position: 'absolute',
          inset: 1,
          borderRadius: '50%',
          background: '#22C55E',
        }}
      />
    </span>
  )
}
