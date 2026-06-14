/**
 * Point rouge pulsant (8px) — signale un joueur dont la sélection nationale joue
 * en direct. Même animation `pulse-ring` que le dot "Mis à jour" (PulseDot),
 * sans texte ni bordure. Discret, cohérent avec la DA.
 */
export default function LiveDot() {
  return (
    <span
      title="En direct"
      aria-label="En direct"
      style={{ position: 'relative', display: 'inline-block', width: 8, height: 8, flexShrink: 0 }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.45)',
          animation: 'pulse-ring 1.5s ease-out infinite',
          transformOrigin: 'center',
        }}
      />
      <span style={{ position: 'absolute', inset: 1, borderRadius: '50%', background: '#EF4444' }} />
    </span>
  )
}
