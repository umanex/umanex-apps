import { getTranslations } from 'next-intl/server';
import { AppStoreBadge } from '@/components/ui/AppStoreBadge';
import { ScreenshotFrame } from '@/components/ui/ScreenshotFrame';

/**
 * S1 — Hero.
 *
 * De kop noemt de concrete differentiator in plaats van een vage belofte; dat is de
 * les uit de Whoop-teardown in het onderzoek. Dit is de enige `<h1>` op de pagina.
 */
export const Hero = async () => {
  const t = await getTranslations('hero');
  const appStore = await getTranslations('appStore');

  return (
    <section id="hero" className="mx-auto max-w-5xl px-6 py-24">
      <div className="grid items-center gap-16 md:grid-cols-2">
        <div>
          <h1 className="font-serif text-5xl leading-tight text-fg-primary">{t('title')}</h1>
          <p className="mt-6 text-lg leading-relaxed text-fg-secondary">{t('subtitle')}</p>

          <div className="mt-10">
            <AppStoreBadge pendingLabel={appStore('pending')} label={t('cta')} />
            <p className="mt-3 text-sm text-fg-tertiary">{t('ctaNote')}</p>
          </div>
        </div>

        <ScreenshotFrame alt={t('screenshotAlt')} />
      </div>
    </section>
  );
};
