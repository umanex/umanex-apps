import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { MetricCard } from '@/components/ui/MetricCard';
import { Reveal } from '@/components/ui/Reveal';

type Metric = { label: string; unit: string; note: string };

/**
 * S3 — Live metrics.
 *
 * Acht kaarten in een 4+4-grid: de zeven KPI's die het active-workout-scherm kent,
 * plus SLAGEN — dat totaal komt uit dezelfde FTMS-stroom (waarheidstabel) en staat
 * in de samenvatting; de kaarttekst zegt dat expliciet, dus er is geen valse
 * live-claim. De voetnoot is niet optioneel: hartslag komt van een losse band en
 * calorieën worden berekend, en zonder die twee zinnen leest de lijst als dingen
 * die de roeimachine allemaal zelf meet.
 */
export const Metrics = async () => {
  const t = await getTranslations('metrics');
  const items = t.raw('items') as Metric[];

  return (
    <Section id="metrics">
      <Reveal>
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} body={t('body')} />
      </Reveal>

      <Reveal>
        <ul className="reveal-stagger mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <MetricCard key={item.label} {...item} />
          ))}
        </ul>

        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-fg-tertiary">{t('footnote')}</p>
      </Reveal>
    </Section>
  );
};
