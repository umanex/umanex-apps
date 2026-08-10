import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';

type Mode = { name: string; range: string };

/**
 * S4 — Doelmodi.
 *
 * Vijf segmenten, zoals de app ze toont. De grenzen erbij, want die staan echt in de
 * code (lib/workout-goals.ts) en ze maken het concreet in plaats van beloftevol.
 */
export const Goals = async () => {
  const t = await getTranslations('goals');
  const modes = t.raw('modes') as Mode[];

  return (
    <Section id="doelen" raised>
      <SectionHeading eyebrow={t('eyebrow')} title={t('title')} body={t('body')} />

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {modes.map((mode) => (
          <li
            key={mode.name}
            className="rounded-card border border-border-subtle bg-bg-base p-5"
          >
            <p className="text-lg text-fg-primary">{mode.name}</p>
            <p className="mt-1 text-sm text-fg-tertiary">{mode.range}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
};
