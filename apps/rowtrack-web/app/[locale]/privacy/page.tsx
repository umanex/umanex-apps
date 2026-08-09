import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { legalHtml } from '@/lib/legal';
import { pageMetadata } from '@/lib/metadata';

type Params = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Params): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'privacy.meta' });

  return pageMetadata({
    locale,
    path: '/privacy',
    title: t('title'),
    description: t('description'),
  });
}

/**
 * Het privacybeleid van de RowTrack-app.
 *
 * Apple eist een publiek bereikbare privacy-URL die consistent is met de App
 * Privacy-labels; zonder die pagina volgt een afwijzing. De app verwijst er intern
 * al naar (`apps/rowtrack/lib/links.ts`), en zolang die URL niet leeft is dat een
 * dood pad in het toestemmingsscherm.
 *
 * De inhoud komt uit `apps/rowtrack/docs/privacybeleid.md` en wordt bij de build
 * gerenderd. Er staat hier bewust geen eigen `<h1>`: het document draagt er zelf
 * één.
 *
 * `dangerouslySetInnerHTML` is hier de juiste weg. De bron is een bestand uit deze
 * repo, geen gebruikersinvoer, en de HTML is bij de build al vastgelegd. Let wel:
 * `marked` laat rauwe HTML in de markdown ongemoeid doorlopen, dus wie dit document
 * bewerkt, bewerkt in feite de pagina.
 *
 * TODO: maten en typografie komen uit Tailwinds eigen schaal — de bron heeft geen
 * web-typeschaal. Zie packages/rowtrack-tokens/TOKENS-TODO.md §2.
 */
export default async function PrivacyPage({ params: { locale } }: Params) {
  setRequestLocale(locale);
  const html = await legalHtml('privacy');

  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <article className="legal" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
