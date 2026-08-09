import { getTranslations, setRequestLocale } from 'next-intl/server';

/**
 * Scaffold-pagina. De echte onepager (S1-S11) komt in fase 2; dit is het minimale
 * bewijs dat de keten werkt: locale -> messages -> tokens -> Tailwind-utilities.
 *
 * De KLEUREN hieronder komen uit RowTrack's rollaag (text-fg-primary,
 * text-fg-secondary, text-fg-tertiary) en zijn dus token-only.
 *
 * TODO: de MATEN niet. `text-5xl`, `text-lg`, `text-sm`, `px-6`, `py-24`, `gap-6` en
 * `max-w-3xl` komen uit Tailwinds eigen schaal, omdat RowTrack's tokenset geen
 * web-typeschaal, geen spacing boven 48 en geen container-widths heeft — zie
 * packages/rowtrack-tokens/TOKENS-TODO.md §2 en §3. Zodra die tokens er zijn,
 * vervangen ze deze klassen. Tot dan is dit een scaffold, geen ontwerp.
 */
export default async function HomePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-24">
      <h1 className="font-serif text-5xl text-fg-primary">{t('hero.title')}</h1>
      <p className="text-lg text-fg-secondary">{t('hero.subtitle')}</p>
      <p className="text-sm text-fg-tertiary">{t('compat.disclaimer')}</p>
    </main>
  );
}
