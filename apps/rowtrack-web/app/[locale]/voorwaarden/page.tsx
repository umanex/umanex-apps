import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { legalHtml } from '@/lib/legal';
import { pageMetadata } from '@/lib/metadata';

type Params = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Params): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'voorwaarden.meta' });

  return pageMetadata({
    locale,
    path: '/voorwaarden',
    title: t('title'),
    description: t('description'),
  });
}

/**
 * De gebruiksvoorwaarden.
 *
 * Apple past zijn standaard-EULA toe wanneer je in App Store Connect geen eigen
 * voorwaarden opgeeft. Dit document vervangt die standaard en bevat daarom Apple's
 * minimumvoorwaarden — plus wat die standaard níet dekt: Belgisch en Europees
 * consumentenrecht, een gezondheidsdisclaimer voor een trainingsapp, en de
 * abonnementsvoorwaarden.
 *
 * LET OP: het document draagt bovenaan de status CONCEPT en is nog niet juridisch
 * nagekeken. Daarom staat `/voorwaarden` bewust nog NIET in `lib/routes.ts` en dus
 * niet in de sitemap: die adverteert dat een pagina af is. Zet hem erin zodra de
 * tekst nagekeken is en de statusregel bijgewerkt.
 *
 * Zelfde opzet als /nl/privacy: de markdown in apps/rowtrack/docs is de enige bron
 * en wordt bij de build gerenderd.
 */
export default async function VoorwaardenPage({ params: { locale } }: Params) {
  setRequestLocale(locale);
  const html = await legalHtml('voorwaarden');

  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <article className="legal" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
