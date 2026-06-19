import type { Metadata } from 'next';
import { Fira_Sans, Merriweather } from 'next/font/google';
import '@umanex/ui/globals.css';
import '@umanex/tokens/variables.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { copy } from '@/lib/copy';
import { site } from '@/lib/site';

const firaSans = Fira_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

// Serif (--umanexFontSerif). preload:false want nog nergens toegepast — laadt pas
// wanneer font-serif effectief gebruikt wordt (bv. serif-headings).
const merriweather = Merriweather({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-serif',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: copy.meta.root.title,
    template: copy.meta.root.titleTemplate,
  },
  description: copy.meta.root.description,
  openGraph: {
    type: 'website',
    locale: 'nl_BE',
    siteName: site.name,
  },
};

// zet de theme class vóór first paint om een flash van het verkeerde theme te vermijden
// light is de merk-default; dark alleen wanneer de bezoeker er expliciet voor koos
const themeInitScript = `(function () {
  try {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl-BE" className={`${firaSans.variable} ${merriweather.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-screen flex-col font-sans bg-background text-foreground antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
