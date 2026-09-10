import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { FaqAccordion, type FaqItem } from '@/components/ui/FaqAccordion';
import { JsonLd } from '@/components/seo/JsonLd';
import { Reveal } from '@/components/ui/Reveal';
import { faqSchema } from '@/lib/schema';

/**
 * S10 — FAQ.
 *
 * Eén `items`-array voedt zowel de accordion als het FAQPage-schema. Dat is geen
 * netheid maar een eis: Google's richtlijn wil dat structured data de zichtbare
 * inhoud beschrijft, en met twee lijsten is dat een belofte die niemand nakomt zodra
 * er een vraag bijkomt.
 */
export const Faq = async () => {
  const t = await getTranslations('faq');
  const items = t.raw('items') as FaqItem[];

  return (
    <Section id="faq">
      <JsonLd schema={faqSchema(items)} />
      <Reveal>
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} />
      </Reveal>
      <Reveal delay={120}>
        <FaqAccordion items={items} />
      </Reveal>
    </Section>
  );
};
