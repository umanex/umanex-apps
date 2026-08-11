import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/layout/Section';
import { AppStoreBadge } from '@/components/ui/AppStoreBadge';
import { Reveal } from '@/components/ui/Reveal';

/**
 * S11 — Slot-CTA.
 *
 * Dezelfde primaire actie als in de hero, aan het eind van het verhaal. Eén actie op
 * de hele pagina, drie keer aangeboden — niet drie verschillende dingen vragen.
 * De accentgloed spiegelt de hero: het verhaal eindigt visueel waar het begon.
 */
export const FinalCta = async () => {
  const t = await getTranslations('finalCta');
  const hero = await getTranslations('hero');
  const appStore = await getTranslations('appStore');

  return (
    <Section id="download" raised>
      <div
        aria-hidden="true"
        className="glow-accent absolute left-1/2 top-1/2 h-96 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2"
      />

      <Reveal>
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-4xl tracking-tight text-fg-primary text-balance md:text-5xl">
            {t('title')}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-fg-secondary">{t('body')}</p>

          <div className="mt-10 flex flex-col items-center">
            <AppStoreBadge pendingLabel={appStore('pending')} label={hero('cta')} />
            <p className="mt-3 text-sm text-fg-tertiary">{appStore('pendingNote')}</p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
};
