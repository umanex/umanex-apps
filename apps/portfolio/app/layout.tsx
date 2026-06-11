import type { Metadata } from 'next';
import { Fira_Sans } from 'next/font/google';
import '@umanex/ui/globals.css';
import '@umanex/tokens/variables.css';
import './theme.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { site } from '@/lib/site';

const firaSans = Fira_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: 'Jeroen Colpaert — UX/UI designer · umanex',
    template: '%s — Jeroen Colpaert',
  },
  description:
    'UX/UI designer met ruime ervaring over het hele design proces in complexe B2B-omgevingen — versterkt met een AI-werkwijze die de output van een klein team levert.',
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
    <html lang="nl-BE" className={firaSans.variable} suppressHydrationWarning>
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
