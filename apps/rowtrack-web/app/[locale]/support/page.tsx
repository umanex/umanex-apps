import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { pageMetadata } from '@/lib/metadata';
import { site } from '@/lib/site';

type Params = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Params): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'support.meta' });

  return pageMetadata({
    locale,
    path: '/support',
    title: t('title'),
    description: t('description'),
  });
}

/**
 * Supportpagina. Apple vereist een publiek bereikbare support-URL bij de
 * store-inzending, dus deze pagina is geen extraatje maar een voorwaarde.
 *
 * Alles hier staat ook in de waarheidstabel van de briefing: de naam-prefix waar de
 * scan op matcht, de losse hartslagband, de berekende calorieën, de ontbrekende
 * bevestigingsmail en de ontbrekende exportknop. Een supportpagina die de app
 * mooier voorstelt dan hij is, levert precies de tickets op die ze moet voorkomen.
 *
 * TODO: maten (text-*, px-*, max-w-*) komen uit Tailwinds eigen schaal — de bron
 * heeft geen web-typeschaal, spacing boven 48 of container-widths. Zie
 * packages/rowtrack-tokens/TOKENS-TODO.md §2 en §3.
 */
export default async function SupportPage({ params: { locale } }: Params) {
  setRequestLocale(locale);
  const t = await getTranslations('support');

  const known = t.raw('known.items') as string[];

  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="font-serif text-4xl text-fg-primary">{t('title')}</h1>
      <p className="mt-6 text-lg text-fg-secondary">{t('intro')}</p>

      <section className="mt-12">
        <h2 className="text-xl text-fg-primary">{t('contact.heading')}</h2>
        <p className="mt-3">
          <a
            href={`mailto:${t('contact.email')}`}
            className="text-accent underline underline-offset-4 hover:text-accent-hover"
          >
            {t('contact.email')}
          </a>
        </p>
        <p className="mt-3 text-fg-secondary">{t('contact.note')}</p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl text-fg-primary">{t('known.heading')}</h2>
        <ul className="mt-3 space-y-3 text-fg-secondary">
          {known.map((item) => (
            <li key={item} className="border-l border-border pl-4">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xl text-fg-primary">{t('account.heading')}</h2>
        <p className="mt-3 text-fg-secondary">{t('account.body')}</p>
      </section>

      <footer className="mt-16 border-t border-border-subtle pt-6 text-sm text-fg-tertiary">
        {site.organisation.name} · {site.organisation.street},{' '}
        {site.organisation.postalCode} {site.organisation.city}
      </footer>
    </main>
  );
}
