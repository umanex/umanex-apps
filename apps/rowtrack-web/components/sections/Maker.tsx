import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { site } from '@/lib/site';

/**
 * S9 — Over de maker.
 *
 * Indie-authenticiteit werkt bij precies het publiek dat premium losse apps koopt.
 *
 * TODO(assets): er hoort een foto bij; die staat nog nergens in de repo. Liever geen
 * foto dan een stockportret — dat laatste ondermijnt exact het punt van deze sectie.
 */
export const Maker = async () => {
  const t = await getTranslations('maker');

  return (
    <Section id="maker">
      <SectionHeading eyebrow={t('eyebrow')} title={t('title')} />

      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-fg-secondary">{t('body')}</p>

      <p className="mt-8">
        <a
          href={`mailto:${site.organisation.email}`}
          className="text-accent underline underline-offset-4 hover:text-accent-hover"
        >
          {t('link')}
        </a>
      </p>
    </Section>
  );
};
