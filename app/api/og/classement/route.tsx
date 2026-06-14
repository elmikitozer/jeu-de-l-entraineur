import { ImageResponse } from 'next/og'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getLeaderboard } from '@/lib/queries'

// Route handler (pas la convention opengraph-image.tsx : le loader de métadonnées
// casse à cause de l'apostrophe du chemin projet — cf. app/api/icon).
export const runtime = 'nodejs'
// Le classement change : on régénère à chaque partage plutôt que de servir un PNG figé.
export const dynamic = 'force-dynamic'

const LIME = '#C8F542'
const INK = '#E8F5EF'
const SUB = 'rgba(255,255,255,0.55)'

// Satori (next/og) impose display:flex sur tout div à plusieurs enfants → chaque
// div ici est explicitement flex, et chaque texte est une chaîne unique.
// Tailles calibrées pour que le top 10 tienne dans 630px sans débordement.
export async function GET() {
  const rows = (await getLeaderboard()).slice(0, 10)
  const today = format(new Date(), 'd MMMM yyyy', { locale: fr })

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          padding: 40,
          background: 'linear-gradient(160deg, #0D4A30 0%, #093623 55%, #052315 100%)',
          color: INK,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 14 }}>
          <div style={{ display: 'flex', fontSize: 18, fontWeight: 700, letterSpacing: 4, color: LIME }}>
            {"JEU DE L'ENTRAÎNEUR · CDM 2026"}
          </div>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 800, marginTop: 4 }}>
            Classement général
          </div>
        </div>

        {rows.length === 0 ? (
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', fontSize: 32, color: SUB }}>
            {"Le classement n'a pas encore commencé."}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {rows.map((r, i) => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.10)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      display: 'flex',
                      width: 40,
                      fontSize: 22,
                      fontWeight: 800,
                      color: i === 0 ? LIME : SUB,
                    }}
                  >
                    {String(r.rank)}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 24,
                      fontWeight: 600,
                      maxWidth: 820,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {r.name}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', fontSize: 26, fontWeight: 800 }}>
                    {String(r.total_points)}
                  </div>
                  <div style={{ display: 'flex', fontSize: 14, color: SUB, marginLeft: 6 }}>pts</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, fontSize: 16, color: SUB }}>
          {`Mis à jour le ${today}`}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
