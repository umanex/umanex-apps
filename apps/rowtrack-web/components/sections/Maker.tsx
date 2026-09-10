import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Reveal } from '@/components/ui/Reveal';
import { site } from '@/lib/site';

/**
 * S9 — Over de maker.
 *
 * Indie-authenticiteit werkt bij precies het publiek dat premium losse apps koopt.
 * De bio staat groot en in serif — een uitspraak van een maker, geen paragraaf
 * productcopy tussen de andere secties.
 *
 * TODO(assets): er hoort een foto bij; die staat nog nergens in de repo. Liever geen
 * foto dan een stockportret — dat laatste ondermijnt exact het punt van deze sectie.
 */
export const Maker = async () => {
  const t = await getTranslations('maker');

  return (
    <Section id="maker">
      <Reveal>
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} />
      </Reveal>

      <Reveal delay={120}>
        <p className="mt-8 max-w-2xl font-serif text-xl leading-relaxed text-fg-secondary md:text-2xl">
          {t('body')}
        </p>

        <p className="mt-8">
          <a
            href={`mailto:${site.organisation.email}`}
            className="text-accent underline underline-offset-4 hover:text-accent-hover"
          >
            {t('link')}
          </a>
        </p>
      </Reveal>
    </Section>
  );
};
