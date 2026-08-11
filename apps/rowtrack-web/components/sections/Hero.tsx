import { getTranslations } from 'next-intl/server';
import { AppStoreBadge } from '@/components/ui/AppStoreBadge';
import { ScreenshotFrame } from '@/components/ui/ScreenshotFrame';
import { Reveal } from '@/components/ui/Reveal';

/**
 * S1 — Hero.
 *
 * De kop noemt de concrete differentiator in plaats van een vage belofte; dat is de
 * les uit de Whoop-teardown in het onderzoek. Dit is de enige `<h1>` op de pagina.
 *
 * De achtergrond is drie decoratieve lagen (raster, fade, accentgloed) — allemaal
 * aria-hidden, allemaal token-kleuren via de classes in globals.css. De telefoon
 * staat licht gedraaid en zweeft traag; beide vallen weg bij reduced motion en
 * bestaan niet zonder de afbeelding, dus de content hangt er nergens van af.
 */
export const Hero = async () => {
  const t = await getTranslations('hero');
  const appStore = await getTranslations('appStore');

  return (
    <section id="hero" className="relative overflow-hidden">
      <div aria-hidden="true" className="bg-grid absolute inset-0" />
      <div aria-hidden="true" className="bg-grid-fade absolute inset-0" />
      <div aria-hidden="true" className="hero-wash absolute inset-0" />
      <div
        aria-hidden="true"
        className="glow-accent absolute -top-24 right-0 h-96 w-96 md:-right-24"
      />

      <div className="relative mx-auto max-w-5xl px-6 py-24 md:py-36">
        <div className="grid items-center gap-16 md:grid-cols-2">
          <div>
            <Reveal>
              <h1 className="font-serif text-5xl leading-tight tracking-tight text-fg-primary text-balance md:text-6xl md:leading-tight">
                {t('title')}
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-fg-secondary">
                {t('subtitle')}
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-10">
                <AppStoreBadge pendingLabel={appStore('pending')} label={t('cta')} />
                <p className="mt-3 text-sm text-fg-tertiary">{t('ctaNote')}</p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={200}>
            {/* Rotatie en zweving op aparte wrappers: de float-animatie animeert
                `transform` en zou een rotate-utility op hetzelfde element wissen. */}
            <div className="md:rotate-2">
              <div className="float-slow">
                <ScreenshotFrame name="active-workout" alt={t('screenshotAlt')} priority />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
