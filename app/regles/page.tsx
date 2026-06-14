export const metadata = {
  title: "Règles — Jeu de l'Entraîneur CdM 2026",
}

// ── Sous-composants ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-line rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-line">
        <h2 className="font-display font-bold text-[22px] uppercase tracking-[0.04em] text-ink">
          {title}
        </h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-[13.5px] font-body">
        <thead>
          <tr style={{ borderBottom: '2px solid var(--c-line)' }}>
            {headers.map((h) => (
              <th
                key={h}
                className="text-left py-2 px-3 font-bold tracking-[0.06em] uppercase text-[11px]"
                style={{ color: 'var(--c-sub)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              style={{ borderBottom: '1px solid var(--c-line)' }}
              className="last:border-b-0"
            >
              {row.map((cell, j) => (
                <td key={j} className="py-2.5 px-3 text-ink align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      className="inline-block font-bold text-[11px] px-2 py-[3px] rounded tracking-[0.06em]"
      style={{ background: color, color: '#fff' }}
    >
      {children}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReglesPage() {
  return (
    <div className="max-w-[860px] mx-auto px-6 md:px-12 pb-16">
      <div className="pt-10 mb-8">
        <h1 className="font-display font-bold italic uppercase text-[48px] md:text-[68px] leading-none tracking-[0.01em] text-white">
          Règles<br />du jeu
        </h1>
        <p className="mt-2 text-[13px] font-bold font-body tracking-[0.18em] uppercase" style={{ color: 'var(--c-lime)' }}>
          Coupe du Monde 2026
        </p>
      </div>

      <div className="flex flex-col gap-6">

        {/* ── Composition ── */}
        <Section title="Composition de l'équipe">
          <ul className="flex flex-col gap-3 text-[14px] font-body text-ink">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: 'var(--c-lime)', color: '#07261B' }}>1</span>
              <span><strong>11 joueurs</strong> par équipe en formation 4‑3‑3 (1 GK, 4 DEF, 3 MID, 3 FWD)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: 'var(--c-lime)', color: '#07261B' }}>2</span>
              <span><strong>Maximum 3 joueurs</strong> de la même nationalité par équipe</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: 'var(--c-lime)', color: '#07261B' }}>3</span>
              <span>Tous les joueurs doivent être <strong>sélectionnés pour la CdM 2026</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: 'var(--c-lime)', color: '#07261B' }}>4</span>
              <span>Mise d&apos;entrée : <strong>20 € par participant</strong></span>
            </li>
          </ul>
        </Section>

        {/* ── Résultat collectif ── */}
        <Section title="Résultat collectif">
          <p className="text-[13px] text-sub font-body mb-4">
            Chaque joueur de l&apos;équipe reçoit des points selon le résultat de son équipe nationale.
          </p>
          <Table
            headers={['Résultat', 'Points']}
            rows={[
              ['Victoire', <span key="v" className="font-bold" style={{ color: 'var(--c-green)' }}>+3 pts</span>],
              ['Match nul', <span key="n" className="font-bold" style={{ color: 'var(--c-blue)' }}>+1 pt</span>],
              ['Défaite', <span key="d" className="text-sub">0 pt</span>],
            ]}
          />
        </Section>

        {/* ── Performances individuelles ── */}
        <Section title="Performances individuelles">
          <Table
            headers={['Action', 'Points', 'Détail']}
            rows={[
              [
                'But — Gardien',
                <span key="g" className="font-bold" style={{ color: 'var(--c-green)' }}>+25 pts</span>,
                <Pill key="p" color="var(--c-green)">GK</Pill>,
              ],
              [
                'But — Défenseur',
                <span key="g" className="font-bold" style={{ color: 'var(--c-green)' }}>+15 pts</span>,
                <Pill key="p" color="#4A8C6B">DEF</Pill>,
              ],
              [
                'But — Milieu',
                <span key="g" className="font-bold" style={{ color: 'var(--c-green)' }}>+10 pts</span>,
                <Pill key="p" color="#3A7A8A">MID</Pill>,
              ],
              [
                'But — Attaquant',
                <span key="g" className="font-bold" style={{ color: 'var(--c-green)' }}>+5 pts</span>,
                <Pill key="p" color="#6A5A9A">FWD</Pill>,
              ],
              [
                'But sur coup franc direct',
                <span key="g" className="font-bold" style={{ color: 'var(--c-green)' }}>+15 pts</span>,
                <span key="d" className="text-[12px] text-sub">Cumulable avec le bonus de position</span>,
              ],
              [
                'But sur penalty (hors TAB)',
                <span key="g" className="font-bold" style={{ color: 'var(--c-blue)' }}>+5 pts</span>,
                <span key="d" className="text-[12px] text-sub">Remplace le bonus de position</span>,
              ],
              [
                'Passe décisive',
                <span key="g" className="font-bold" style={{ color: 'var(--c-blue)' }}>+3 pts</span>,
                '',
              ],
              [
                'Homme du match',
                <span key="g" className="font-bold" style={{ color: 'var(--c-blue)' }}>+3 pts</span>,
                '',
              ],
              [
                'Cleansheet',
                <span key="g" className="font-bold" style={{ color: 'var(--c-blue)' }}>+5 pts</span>,
                <Pill key="p" color="var(--c-green)">GK uniquement</Pill>,
              ],
              [
                'Penalty arrêté',
                <span key="g" className="font-bold" style={{ color: 'var(--c-blue)' }}>+5 pts</span>,
                <span key="d" className="text-[12px] text-sub">En jeu ou aux TAB</span>,
              ],
              [
                'Carton rouge',
                <span key="g" className="font-bold" style={{ color: 'var(--c-red)' }}>−10 pts</span>,
                '',
              ],
            ]}
          />

          <div className="mt-4 p-4 rounded-xl text-[12.5px] font-body text-sub leading-relaxed" style={{ background: 'var(--c-zebra)' }}>
            <strong className="text-ink">Note sur les buts :</strong> Un but sur coup franc rapporte le bonus de position <em>et</em> +15 pts supplémentaires. Un but sur penalty (hors TAB) rapporte uniquement +5 pts, sans bonus de position. Les buts en TAB ne rapportent aucun point individuel — seuls les penalties <em>arrêtés</em> comptent.
          </div>
        </Section>

        {/* ── Cagnotte ── */}
        <Section title="Répartition de la cagnotte">
          <p className="text-[14px] font-body text-ink mb-4">
            La cagnotte totale est calculée sur la base de <strong>20 € × nombre de participants</strong>.
            Le <strong>1ᵉʳ remporte l&apos;intégralité de la cagnotte</strong> ; le <strong>2ᵉ et le 3ᵉ sont remboursés de leur mise</strong> (20 € chacun).
          </p>
          <div className="flex flex-col gap-3">
            <div
              className="flex items-center justify-between p-5 rounded-xl"
              style={{ background: 'var(--c-zebra)' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-[32px] leading-none">🥇</span>
                <div>
                  <div className="font-bold text-[16px] text-ink">1ᵉʳ du classement</div>
                  <div className="text-[12px] text-sub">Remporte toute la cagnotte</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-display font-bold italic text-[36px] leading-none" style={{ color: 'var(--c-green)' }}>
                  100%
                </div>
                <div className="text-[11px] text-sub">de la cagnotte</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--c-zebra)' }}>
              <div className="flex items-center gap-3">
                <span className="text-[26px] leading-none">🥈</span>
                <div>
                  <div className="font-bold text-[15px] text-ink">2ᵉ du classement</div>
                  <div className="text-[12px] text-sub">Remboursé de sa mise</div>
                </div>
              </div>
              <div className="font-display font-bold italic text-[24px] leading-none text-sub">20 €</div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--c-zebra)' }}>
              <div className="flex items-center gap-3">
                <span className="text-[26px] leading-none">🥉</span>
                <div>
                  <div className="font-bold text-[15px] text-ink">3ᵉ du classement</div>
                  <div className="text-[12px] text-sub">Remboursé de sa mise</div>
                </div>
              </div>
              <div className="font-display font-bold italic text-[24px] leading-none text-sub">20 €</div>
            </div>
          </div>
        </Section>

      </div>
    </div>
  )
}
