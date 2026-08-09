import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { MetricCard } from '@/components/ui/MetricCard';

type Metric = { label: string; unit: string; note: string };

/**
 * S3 — Live metrics.
 *
 * Zeven kaarten, precies de zeven KPI's die het active-workout-scherm kent. De
 * voetnoot is niet optioneel: hartslag komt van een losse band en calorieën worden
 * berekend, en zonder die twee zinnen leest de lijst als zeven dingen die de
 * roeimachine meet.
 */
export const Metrics = async () => {
  const t = await getTranslations('metrics');
  const items = t.raw('items') as Metric[];

  return (
    <Section id="metrics">
      <SectionHeading eyebrow={t('eyebrow')} title={t('title')} body={t('body')} />

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </ul>

      <p className="mt-8 max-w-2xl text-sm leading-relaxed text-fg-tertiary">{t('footnote')}</p>
    </Section>
  );
};
