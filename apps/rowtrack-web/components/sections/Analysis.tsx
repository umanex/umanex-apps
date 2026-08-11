import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ScreenshotFrame } from '@/components/ui/ScreenshotFrame';
import { Reveal } from '@/components/ui/Reveal';

type Tab = { name: string; note: string };

/**
 * S5 — Analyse & splits.
 *
 * De drie tabs uit het detailscherm. Bij Hartslag staat expliciet dat hij alleen
 * verschijnt wanneer de training er hartslag in heeft — dat is precies wat de code
 * doet, en zonder die zin is een ontbrekende tab een bug in plaats van gedrag.
 *
 * De telefoon draait de andere kant op dan de hero — twee keer dezelfde tilt zou
 * als sjabloon lezen, gespiegeld leest het als compositie.
 */
export const Analysis = async () => {
  const t = await getTranslations('analysis');
  const tabs = t.raw('tabs') as Tab[];

  return (
    <Section id="analyse">
      <div className="grid items-center gap-16 md:grid-cols-2">
        <div>
          <Reveal>
            <SectionHeading eyebrow={t('eyebrow')} title={t('title')} body={t('body')} />
          </Reveal>

          <Reveal>
            <dl className="reveal-stagger mt-10 space-y-6">
              {tabs.map((tab) => (
                <div
                  key={tab.name}
                  className="rounded-highlight-row border-l border-border-strong pl-5"
                >
                  <dt className="text-lg text-fg-primary">{tab.name}</dt>
                  <dd className="mt-1 leading-relaxed text-fg-secondary">{tab.note}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        {/* TODO(assets): het detailscherm met de drie tabs is beter voor deze sectie,
            maar dat vraagt een ingelogd testaccount met een training die hartslag
            bevat. Tot dan de samenvatting — ook een na-afloop-scherm, en echt. */}
        <Reveal delay={150}>
          <div className="md:-rotate-2">
            <ScreenshotFrame
              name="workout-summary"
              alt="Het samenvattingsscherm na een training, met afstand, duur, energie, slagen en de gemiddelden per metric."
            />
          </div>
        </Reveal>
      </div>
    </Section>
  );
};
