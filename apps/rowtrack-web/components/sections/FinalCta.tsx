import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/layout/Section';
import { AppStoreBadge } from '@/components/ui/AppStoreBadge';

/**
 * S11 — Slot-CTA.
 *
 * Dezelfde primaire actie als in de hero, aan het eind van het verhaal. Eén actie op
 * de hele pagina, drie keer aangeboden — niet drie verschillende dingen vragen.
 */
export const FinalCta = async () => {
  const t = await getTranslations('finalCta');
  const hero = await getTranslations('hero');
  const appStore = await getTranslations('appStore');

  return (
    <Section id="download" raised>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-serif text-4xl text-fg-primary">{t('title')}</h2>
        <p className="mt-4 text-lg text-fg-secondary">{t('body')}</p>

        <div className="mt-10 flex flex-col items-center">
          <AppStoreBadge pendingLabel={appStore('pending')} label={hero('cta')} />
          <p className="mt-3 text-sm text-fg-tertiary">{appStore('pendingNote')}</p>
        </div>
      </div>
    </Section>
  );
};
