import type { Metadata, Viewport } from 'next';
import { Barlow_Condensed, Space_Grotesk } from 'next/font/google';
import './globals.css';
// import DarkModeToggle from '@/components/DarkModeToggle';
import FooterUpdatedAt from '@/components/FooterUpdatedAt';
import MobileMenu from '@/components/MobileMenu';
import NavLinks from '@/components/NavLinks';
import PulseDot from '@/components/PulseDot';
import SearchOverlay from '@/components/SearchOverlay';

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

// Police de corps principale, self-hostée via next/font (plus de <link> Google
// render-blocking). Alimente la variable --font-body utilisée par globals.css.
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Jeu de l'Entraîneur — CdM 2026",
  description:
    "La version 2026 du célèbre Jeu de l'Entraîneur, pour parier sur les résultats de la Coupe du Monde 2026.",
  // Icônes + manifest servis par des route handlers (/api/*) au lieu des
  // conventions de fichiers, qui ne buildent pas depuis un chemin contenant une
  // apostrophe (« l'entraineur »).
  manifest: '/api/manifest',
  icons: {
    icon: [{ url: '/api/icon', sizes: '512x512', type: 'image/png' }],
    apple: [{ url: '/api/apple-icon', sizes: '180x180', type: 'image/png' }],
  },
  // Mode "app" sur iPhone une fois ajouté à l'écran d'accueil (plein écran, sans
  // la barre Safari).
  appleWebApp: {
    capable: true,
    title: "Jeu de l'Entraîneur",
    statusBarStyle: 'black',
  },
};

export const viewport: Viewport = {
  themeColor: '#093623',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${barlowCondensed.variable} ${spaceGrotesk.variable}`}
    >
      <body
        className="font-body antialiased text-ink min-h-dvh flex flex-col"
        style={{ background: 'var(--c-bg-gradient)' }}
      >
        {/* ── Navbar ── */}
        <header
          className="sticky top-0 z-50 transition-colors duration-200"
          style={{ background: 'var(--c-nav-bg)', borderBottom: '1px solid var(--c-nav-border)' }}
        >
          <nav className="max-w-[1280px] mx-auto px-6 md:px-12 flex items-center gap-6 h-16">
            {/* Logo : badge lime + texte */}
            <a href="/" className="flex items-center gap-2.5 whitespace-nowrap flex-shrink-0">
              <span
                className="flex items-center justify-center rounded-lg text-[13px] font-bold font-body flex-shrink-0"
                style={{ background: 'var(--c-lime)', color: '#07261B', padding: '4px 9px' }}
              >
                JE
              </span>
              <span
                className="font-body font-bold text-[17px]"
                style={{ color: 'var(--c-nav-text-strong)' }}
              >
                Jeu de l&apos;Entraîneur
              </span>
            </a>

            {/* Liens desktop avec pill actif */}
            <NavLinks />

            <div className="ml-auto flex items-center gap-2">
              {/* Dot + "Mise à jour" */}
              <span className="hidden md:flex items-center gap-2">
                <PulseDot />
                <FooterUpdatedAt />
              </span>
              {/* <DarkModeToggle /> */}
              <SearchOverlay />
              <MobileMenu />
            </div>
          </nav>
          {/* Ligne lime 2px */}
          <div className="h-0.5" style={{ background: 'var(--c-nav-dot)' }} />
        </header>

        {/* ── Contenu ── */}
        <main className="flex-1">{children}</main>

        {/* ── Footer ── */}
        <footer className="mt-16" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <span className="font-body">Jeu de l&apos;Entraîneur · CdM 2026</span>
            <FooterUpdatedAt />
          </div>
        </footer>
      </body>
    </html>
  );
}
