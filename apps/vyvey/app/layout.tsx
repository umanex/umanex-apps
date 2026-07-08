import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Lexend_Deca } from 'next/font/google';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { site } from '@/lib/site';
import './globals.css';

const lexendDeca = Lexend_Deca({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  display: 'swap',
  variable: '--font-lexend-deca',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: 'Vyvey - Het andere interieur',
    template: '%s | Vyvey',
  },
  description: site.description,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'nl_BE',
    url: site.url,
    siteName: site.legalName,
    title: 'Vyvey - Het andere interieur',
    description: site.description,
    images: [{ url: '/images/og-image.jpg', width: 1200, height: 630, alt: 'Vyvey - het andere interieur' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vyvey - Het andere interieur',
    description: site.description,
    images: ['/images/og-image.jpg'],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl" className={lexendDeca.variable}>
      <body>
        <a
          href="#top"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-ink focus:shadow-card"
        >
          Naar inhoud
        </a>
        <Header />
        <main id="top">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
