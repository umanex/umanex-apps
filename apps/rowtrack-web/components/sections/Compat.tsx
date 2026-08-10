import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';

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
      <SectionHeading eyebrow={t('eyebrow')} title={t('title')} body={t('body')} />

      <p className="mt-8 max-w-2xl border-l border-accent pl-5 leading-relaxed text-fg-secondary">
        {t('scan')}
      </p>

      <p className="mt-8 max-w-2xl text-sm leading-relaxed text-fg-tertiary">{t('disclaimer')}</p>
    </Section>
  );
};
