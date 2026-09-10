import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/ui/Reveal';
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder';
import { copy } from '@/lib/copy';
import { buttonVariants } from '@umanex/ui/components/ui/button';

const hero = copy.home.hero;

// De H1 draagt sinds 2026-08-24 de belofte en niet meer de eigennaam: de site spreekt een koper
// aan, en die zoekt op zijn probleem. De naam staat in de header en in de footer.
export const Hero = () => (
  <section className="py-20 sm:py-28">
    <Container className="grid items-center gap-12 lg:grid-cols-[3fr_2fr]">
      <div className="space-y-6">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            {hero.eyebrow}
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {hero.title}
            <span className="text-primary">.</span>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="max-w-xl text-lg text-muted-foreground sm:text-xl">
            {hero.intro}
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link href={hero.cta.href} className={buttonVariants({ size: 'lg' })}>
              {hero.cta.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={hero.secondaryCta.href}
              className={buttonVariants({ variant: 'outline', size: 'lg' })}
            >
              {hero.secondaryCta.label}
            </Link>
          </div>
        </Reveal>
      </div>
      <Reveal delay={0.2} className="mx-auto w-full max-w-sm lg:max-w-none">
        <div className="group relative">
          <div
            aria-hidden="true"
            className="absolute -inset-2 -z-10 -rotate-2 rounded-2xl bg-accent transition-transform duration-300 group-hover:rotate-0"
          />
          <PhotoPlaceholder />
        </div>
      </Reveal>
    </Container>
  </section>
);
