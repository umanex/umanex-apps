import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';

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
      <SectionHeading eyebrow={t('eyebrow')} title={t('title')} body={t('body')} />

      <ul className="mt-10 max-w-2xl space-y-4">
        {points.map((point) => (
          <li key={point} className="flex gap-3 leading-relaxed text-fg-secondary">
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
    </Section>
  );
};
