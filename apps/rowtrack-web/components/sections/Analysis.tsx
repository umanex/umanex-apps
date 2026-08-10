import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ScreenshotFrame } from '@/components/ui/ScreenshotFrame';

type Tab = { name: string; note: string };

/**
 * S5 — Analyse & splits.
 *
 * De drie tabs uit het detailscherm. Bij Hartslag staat expliciet dat hij alleen
 * verschijnt wanneer de training er hartslag in heeft — dat is precies wat de code
 * doet, en zonder die zin is een ontbrekende tab een bug in plaats van gedrag.
 */
export const Analysis = async () => {
  const t = await getTranslations('analysis');
  const tabs = t.raw('tabs') as Tab[];

  return (
    <Section id="analyse">
      <div className="grid items-center gap-16 md:grid-cols-2">
        <div>
          <SectionHeading eyebrow={t('eyebrow')} title={t('title')} body={t('body')} />

          <dl className="mt-10 space-y-6">
            {tabs.map((tab) => (
              <div key={tab.name}>
                <dt className="text-lg text-fg-primary">{tab.name}</dt>
                <dd className="mt-1 leading-relaxed text-fg-secondary">{tab.note}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* TODO(assets): het detailscherm met de drie tabs is beter voor deze sectie,
            maar dat vraagt een ingelogd testaccount met een training die hartslag
            bevat. Tot dan de samenvatting — ook een na-afloop-scherm, en echt. */}
        <ScreenshotFrame
          name="workout-summary"
          alt="Het samenvattingsscherm na een training, met afstand, duur, energie, slagen en de gemiddelden per metric."
        />
      </div>
    </Section>
  );
};
