import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { PricingCard } from '@/components/ui/PricingCard';
import { Reveal } from '@/components/ui/Reveal';
import { site } from '@/lib/site';

/**
 * S8 — Prijzen.
 *
 * Prijzen tonen in plaats van verbergen is een conversiehefboom, maar alleen voor een
 * prijs die bestaat. Er zit vandaag geen in-app-aankoopcode in de app, dus Pro draagt
 * een "Binnenkort"-label en de sectie zegt met zoveel woorden dat er niets
 * gefactureerd wordt. De bedragen zelf komen uit lib/site.ts, dezelfde bron als de
 * JSON-LD — anders staat er straks op twee plekken een ander getal.
 */
export const Pricing = async () => {
  const t = await getTranslations('pricing');
  const { pricing } = site;

  return (
    <Section id="prijzen" raised>
      <Reveal>
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} body={t('body')} />
      </Reveal>

      <Reveal>
        <div className="reveal-stagger mt-12 grid gap-6 md:grid-cols-2">
          <PricingCard
            name={t('free.name')}
            price={t('free.price')}
            period={t('free.period')}
            features={t.raw('free.features') as string[]}
          />
          <PricingCard
            featured
            badge={t('pro.badge')}
            name={t('pro.name')}
            price={`€${pricing.proMonthly}`}
            period={t('pro.period')}
            features={t.raw('pro.features') as string[]}
          />
        </div>

        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-fg-tertiary">{t('note')}</p>
      </Reveal>
    </Section>
  );
};
