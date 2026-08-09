import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Albert_Sans, Source_Serif_4 } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale, routing } from '@/i18n/routing';
import { JsonLd } from '@/components/seo/JsonLd';
import { Footer } from '@/components/layout/Footer';
import { organisationSchema } from '@/lib/schema';
import { site } from '@/lib/site';

// Volgorde is functioneel: de rollaag moet vóór globals.css staan, anders zijn de
// custom properties nog niet gedefinieerd wanneer Tailwind zijn base-laag uitrolt.
import '@umanex/rowtrack-tokens/theme.css';
import '../globals.css';

// De familienamen komen uit Core.fontFamily in de tokens (albertSans, sourceSerif).
// Let op de mapping: het token zegt "Source Serif Pro", Google Fonts levert die
// familie tegenwoordig als "Source Serif 4" — zie TOKENS-TODO.md §2c.
//
// next/font hasht de naam en levert hem via de CSS-variabele; de preset verwijst
// naar var(--font-sans) / var(--font-serif) en noemt de familie zelf nergens.
const sans = Albert_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const serif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'meta' });

  return {
    // Maakt elke relatieve URL in de metadata van onderliggende pagina's absoluut —
    // canonical, hreflang en og:url. Zonder metadataBase logt Next een waarschuwing
    // en valt hij terug op localhost, wat in productie stilzwijgend foute canonicals
    // oplevert.
    metadataBase: new URL(site.url),
    title: {
      default: t('title'),
      // Subpagina's zetten alleen hun eigen naam ("Support"); de template maakt er
      // "Support — RowTrack" van.
      template: `%s — ${site.name}`,
    },
    description: t('description'),
  };
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // De middleware matcht op het URL-segment, niet op de locale-lijst. Zonder deze
  // check rendert /de een lege layout in plaats van een 404.
  if (!isLocale(locale)) notFound();

  // Zonder setRequestLocale valt elke pagina terug op dynamic rendering, omdat
  // next-intl de locale dan uit de request-headers moet halen. Voor een
  // marketingsite die volledig statisch kan, is dat puur verlies.
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} className={`${sans.variable} ${serif.variable}`}>
      <body>
        {/* Site-brede entiteit; de MobileApplication staat op de onepager zelf. */}
        <JsonLd schema={organisationSchema()} />
        <NextIntlClientProvider messages={messages}>
          {children}
          <Footer locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
