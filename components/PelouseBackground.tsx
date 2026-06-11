const STROKE = 'rgba(255,255,255,0.05)'
const MEDIAN = 'rgba(255,255,255,0.035)'

export default function PelouseBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Bandes de tonte */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: [
            'repeating-linear-gradient(',
            '90deg,',
            'rgba(255,255,255,0.045) 0,',
            'rgba(255,255,255,0.045) var(--pitch-stripe),',
            'transparent var(--pitch-stripe),',
            'transparent calc(var(--pitch-stripe) * 2)',
            ')',
          ].join(' '),
        }}
      />

      {/* Rond central */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 'var(--pitch-circle-top)',
          width: 'var(--pitch-circle-size)',
          height: 'var(--pitch-circle-size)',
          marginLeft: 'calc(var(--pitch-circle-size) / -2)',
          borderRadius: '50%',
          border: `2px solid ${STROKE}`,
        }}
      />

      {/* Point central */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 'calc(var(--pitch-circle-top) + var(--pitch-circle-size) / 2 - 5px)',
          width: 10,
          height: 10,
          marginLeft: -5,
          borderRadius: '50%',
          background: STROKE,
        }}
      />

      {/* Ligne médiane */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 'calc(var(--pitch-circle-top) + var(--pitch-circle-size) / 2)',
          height: 2,
          background: MEDIAN,
        }}
      />

      {/* Coin haut-gauche */}
      <div style={{ position: 'absolute', top: -70, left: -70, width: 140, height: 140, borderRadius: '50%', border: `2px solid ${STROKE}` }} />
      {/* Coin haut-droit */}
      <div style={{ position: 'absolute', top: -70, right: -70, width: 140, height: 140, borderRadius: '50%', border: `2px solid ${STROKE}` }} />
      {/* Coin bas-gauche */}
      <div style={{ position: 'absolute', bottom: -70, left: -70, width: 140, height: 140, borderRadius: '50%', border: `2px solid ${STROKE}` }} />
      {/* Coin bas-droit */}
      <div style={{ position: 'absolute', bottom: -70, right: -70, width: 140, height: 140, borderRadius: '50%', border: `2px solid ${STROKE}` }} />
    </div>
  )
}
