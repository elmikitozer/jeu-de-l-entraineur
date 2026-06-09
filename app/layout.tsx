import type { Metadata } from 'next';
import { Barlow_Condensed, Outfit } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import TriStripe from '@/components/TriStripe';
import DarkModeToggle from '@/components/DarkModeToggle';
import FooterUpdatedAt from '@/components/FooterUpdatedAt';
import MobileMenu from '@/components/MobileMenu';

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
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Jeu de l'Entraîneur — CdM 2026",
  description:
    'La version 2026 du célèbre Jeu de l’Entraîneur, pour parier sur les résultats de la Coupe du Monde 2026.',
};

const NAV_LINKS = [
  { href: '/', label: 'Classement' },
  { href: '/stats', label: 'Stats' },
  { href: '/calendrier', label: 'Calendrier' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${barlowCondensed.variable} ${outfit.variable}`}
    >
      <head>
        {/* Initialise le thème avant hydration pour éviter le flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body className="font-body antialiased bg-bg text-ink min-h-screen flex flex-col">
        {/* ── Navbar ── */}
        <header className="sticky top-0 z-50 bg-card border-b border-line">
          <nav className="max-w-[1280px] mx-auto px-6 md:px-12 flex items-center gap-8 h-16">
            <Link
              href="/"
              className="font-display font-bold text-[22px] uppercase tracking-[0.06em] text-ink whitespace-nowrap"
            >
              Jeu de l&apos;Entraîneur
            </Link>

            {/* Liens desktop */}
            <div className="hidden md:flex items-center gap-6 text-[14px] font-semibold font-body text-sub">
              {NAV_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} className="hover:text-ink transition-colors">
                  {label}
                </Link>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden md:block">
                <FooterUpdatedAt />
              </span>
              <DarkModeToggle />
              <MobileMenu />
            </div>
          </nav>
          <TriStripe height={5} />
        </header>

        {/* ── Contenu ── */}
        <main className="flex-1">{children}</main>

        {/* ── Footer ── */}
        <footer className="border-t border-line mt-16">
          <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-sub">
            <span className="font-body">Jeu de l&apos;Entraîneur · CdM 2026</span>
            <FooterUpdatedAt />
          </div>
        </footer>
      </body>
    </html>
  );
}
