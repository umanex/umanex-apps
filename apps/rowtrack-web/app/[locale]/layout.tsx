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
    // suppressHydrationWarning: het inline script hieronder zet data-js op <html>
    // vóór hydration — hetzelfde patroon (en dezelfde reden) als next-themes.
    <html lang={locale} className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <body>
        {/* De data-js-gate voor de motion-laag in globals.css. Inline en synchroon,
            vóór de rest van de body parset: de verborgen begintoestand van de
            scroll-onthulling bestaat alleen wanneer dit attribuut er staat, dus
            zonder JavaScript is elke sectie gewoon direct zichtbaar — en een flits
            van verborgen content kan niet, want het attribuut staat er vóór paint.
            De IntersectionObserver-check hoort bij de gate: een browser zonder
            observer krijgt het no-JS-pad (alles zichtbaar) in plaats van een
            begintoestand die nooit meer weggaat. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if ('IntersectionObserver' in window) document.documentElement.setAttribute('data-js','')",
          }}
        />
        {/* Site-brede entiteit; de MobileApplication staat op de onepager zelf. */}
        <JsonLd schema={organisationSchema()} />
        <NextIntlClientProvider messages={messages}>
          {children}
          <Footer locale={locale} />
        </NextIntlClientProvider>
        {/* De onthulling zelf: één gedeelde observer over alle .reveal-blokken.
            Inline aan het einde van de body — draait zodra de DOM geparset is,
            vóór en onafhankelijk van React-hydration. Boven de vouw vuurt hij
            meteen, dus de hero hangt niet aan de bundel. De focusin-listener is
            het toetsenbord-vangnet: een element dat door focus nét binnen de
            onderste 10%-band scrollt (buiten de rootMargin) wordt toch onthuld. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.setAttribute('data-revealed', '');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  document.addEventListener('focusin', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('.reveal') : null;
    if (el && !el.hasAttribute('data-revealed')) {
      el.setAttribute('data-revealed', '');
      io.unobserve(el);
    }
  });
})();`,
          }}
        />
      </body>
    </html>
  );
}
