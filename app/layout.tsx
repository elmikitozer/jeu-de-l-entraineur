import type { Metadata } from 'next';
import { Barlow_Condensed, Outfit } from 'next/font/google';
import './globals.css';
import DarkModeToggle from '@/components/DarkModeToggle';
import FooterUpdatedAt from '@/components/FooterUpdatedAt';
import MobileMenu from '@/components/MobileMenu';
import NavLinks from '@/components/NavLinks';

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-body-fallback',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Jeu de l'Entraîneur — CdM 2026",
  description:
    "La version 2026 du célèbre Jeu de l'Entraîneur, pour parier sur les résultats de la Coupe du Monde 2026.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${barlowCondensed.variable} ${outfit.variable}`}
    >
      <head>
        {/* Space Grotesk — police principale thème Electric Green */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap"
        />
        {/* Restaure dark mode avant hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body
        className="font-body antialiased text-ink min-h-screen flex flex-col"
        style={{ background: 'var(--c-bg-gradient)' }}
      >
        {/* ── Navbar ── */}
        <header className="sticky top-0 z-50">
          <nav className="max-w-[1280px] mx-auto px-6 md:px-12 flex items-center gap-6 h-16">
            {/* Logo : badge lime + texte blanc */}
            <a href="/" className="flex items-center gap-2.5 whitespace-nowrap flex-shrink-0">
              <span
                className="flex items-center justify-center rounded-lg text-[13px] font-bold font-body flex-shrink-0"
                style={{ background: 'var(--c-lime)', color: 'var(--c-ink)', padding: '4px 9px' }}
              >
                JE
              </span>
              <span className="font-body font-bold text-[17px] text-white">
                Jeu de l&apos;Entraîneur
              </span>
            </a>

            {/* Liens desktop avec pill actif */}
            <NavLinks />

            <div className="ml-auto flex items-center gap-2">
              {/* Dot lime + "Mise à jour" */}
              <span className="hidden md:flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
                  style={{ background: 'var(--c-lime)' }}
                />
                <FooterUpdatedAt />
              </span>
              <DarkModeToggle />
              <MobileMenu />
            </div>
          </nav>
          {/* Ligne lime 2px */}
          <div className="h-0.5" style={{ background: 'var(--c-lime)' }} />
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
