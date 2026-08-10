import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';

type Record_ = { name: string; note: string };

/**
 * S6 — Persoonlijke records.
 *
 * De enige plek op de pagina waar de achievement-kleur voorkomt. Dat is een afspraak
 * uit de briefing: gebruik je hem ook elders, dan betekent hij niets meer op het
 * moment dat het ertoe doet.
 *
 * TWEE records, niet drie. Het onderzoeksdocument noemde ook een 500 meter; die
 * bestaat niet in de app.
 */
export const Records = async () => {
  const t = await getTranslations('records');
  const items = t.raw('items') as Record_[];

  return (
    <Section id="records" raised>
      <SectionHeading eyebrow={t('eyebrow')} title={t('title')} body={t('body')} />

      <ul className="mt-12 grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.name}
            className="rounded-card border border-achievement-muted bg-bg-base p-6"
          >
            <p className="text-lg text-achievement">{item.name}</p>
            <p className="mt-2 leading-relaxed text-fg-secondary">{item.note}</p>
          </li>
        ))}
      </ul>

      <p className="mt-8 max-w-2xl text-sm leading-relaxed text-fg-tertiary">{t('footnote')}</p>
    </Section>
  );
};
