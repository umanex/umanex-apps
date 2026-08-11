import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Reveal } from '@/components/ui/Reveal';

type Props = {
  locale: string;
};

/**
 * S7 — Privacy.
 *
 * Het vertrouwensgat dat de concurrentie laat liggen. Let op wat hier NIET staat:
 * "je gegevens blijven op je toestel". RowTrack heeft een Supabase-backend, dus die
 * claim zou onwaar zijn — en juist bij privacy is een te mooie claim het snelst
 * ontmaskerd en het duurst.
 */
export const Privacy = async ({ locale }: Props) => {
  const t = await getTranslations('privacy');
  const points = t.raw('points') as string[];

  return (
    <Section id="privacy">
      <Reveal>
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} body={t('body')} />
      </Reveal>

      <Reveal>
        <ul className="reveal-stagger mt-10 max-w-2xl divide-y divide-border-subtle border-y border-border-subtle">
          {points.map((point) => (
            <li key={point} className="flex gap-3 py-4 leading-relaxed text-fg-secondary">
              <span aria-hidden="true" className="text-accent">
                —
              </span>
              {point}
            </li>
          ))}
        </ul>

        <p className="mt-8">
          <a
            href={`/${locale}/privacy`}
            className="text-accent underline underline-offset-4 hover:text-accent-hover"
          >
            {t('link')}
          </a>
        </p>
      </Reveal>
    </Section>
  );
};
