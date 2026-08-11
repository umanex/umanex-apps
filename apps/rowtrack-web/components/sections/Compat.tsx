import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Reveal } from '@/components/ui/Reveal';

/**
 * S2 — "Werkt dit met mijn machine?"
 *
 * De objectie die de concurrentie laat liggen, en daarom de eerste sectie na de hero.
 * Hij bevestigt de compatibiliteit, legt uit hóe (FTMS), en zegt er meteen bij waar de
 * grens ligt: de scan matcht op naam-prefix, dus over andere machines wordt niets
 * beloofd. Dat laatste is geen slag om de arm maar wat de code doet.
 */
export const Compat = async () => {
  const t = await getTranslations('compat');

  return (
    <Section id="compatibiliteit" raised>
      <Reveal>
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} body={t('body')} />
      </Reveal>

      <Reveal delay={120}>
        <p className="mt-10 max-w-2xl rounded-card border border-border-subtle border-l-accent bg-bg-raised p-6 leading-relaxed text-fg-secondary shadow-button-outline">
          {t('scan')}
        </p>

        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-fg-tertiary">
          {t('disclaimer')}
        </p>
      </Reveal>
    </Section>
  );
};
