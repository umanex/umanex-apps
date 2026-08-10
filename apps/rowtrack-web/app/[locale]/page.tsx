import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { JsonLd } from '@/components/seo/JsonLd';
import { Hero } from '@/components/sections/Hero';
import { Compat } from '@/components/sections/Compat';
import { Metrics } from '@/components/sections/Metrics';
import { Goals } from '@/components/sections/Goals';
import { Analysis } from '@/components/sections/Analysis';
import { Records } from '@/components/sections/Records';
import { Privacy } from '@/components/sections/Privacy';
import { Pricing } from '@/components/sections/Pricing';
import { Maker } from '@/components/sections/Maker';
import { Faq } from '@/components/sections/Faq';
import { FinalCta } from '@/components/sections/FinalCta';
import { pageMetadata } from '@/lib/metadata';
import { applicationSchema } from '@/lib/schema';

type Params = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Params): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'meta' });

  return pageMetadata({
    locale,
    path: '',
    title: t('title'),
    description: t('description'),
  });
}

/**
 * De onepager, S1-S11 in de volgorde uit de briefing.
 *
 * Alles is een server-component: er gaat geen byte JavaScript naar de browser voor de
 * inhoud. De FAQ werkt op native `<details>`, dus ook de enige interactie op de pagina
 * heeft er geen nodig — daarmee is "leesbaar zonder JavaScript" geen belofte maar de
 * enige mogelijke uitkomst.
 *
 * TODO: de MATEN in de secties komen uit Tailwinds eigen schaal. RowTrack's tokenset
 * heeft geen web-typeschaal, geen spacing boven 48 en geen container-widths — zie
 * packages/rowtrack-tokens/TOKENS-TODO.md §2 en §3. De KLEUREN zijn wel token-only, en
 * daar staat een guard op.
 */
export default async function HomePage({ params: { locale } }: Params) {
  setRequestLocale(locale);

  return (
    <>
      <JsonLd schema={applicationSchema()} />
      <Hero />
      <Compat />
      <Metrics />
      <Goals />
      <Analysis />
      <Records />
      <Privacy locale={locale} />
      <Pricing />
      <Maker />
      <Faq />
      <FinalCta />
    </>
  );
}
