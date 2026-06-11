import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/ui/Reveal';
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder';
import { site } from '@/lib/site';

export const Hero = () => (
  <section className="py-20 sm:py-28">
    <Container className="grid items-center gap-12 lg:grid-cols-[3fr_2fr]">
      <div className="space-y-6">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            UX/UI designer · umanex
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Jeroen Colpaert
            <span className="text-primary">.</span>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="max-w-xl text-lg text-muted-foreground sm:text-xl">
            Ik help B2B software teams gebruiksvriendelijke functionaliteiten lanceren —
            met ruime ervaring over het hele design proces, stevige voeten in complexe
            stakeholder-omgevingen, en een AI-werkwijze die de output van een klein team
            levert.
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a
              href={site.contactHref}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Kennismaken
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href={site.linkedin}
              rel="noopener noreferrer"
              target="_blank"
              className="inline-flex items-center rounded-md border border-border px-5 py-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              LinkedIn
            </a>
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
