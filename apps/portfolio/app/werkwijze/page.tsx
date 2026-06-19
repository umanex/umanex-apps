import type { Metadata } from 'next';
import { ArrowRight, FileText, Layers, Palette, Repeat } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/ui/Reveal';
import { RichText } from '@/components/ui/RichText';
import { copy } from '@/lib/copy';
import { site } from '@/lib/site';
import { buttonVariants } from '@umanex/ui/components/ui/button';

export const metadata: Metadata = {
  title: copy.meta.werkwijze.title,
  description: copy.meta.werkwijze.description,
};

const { hero, principles, forYourTeam, contact } = copy.werkwijze;

const principleIcons = {
  layers: Layers,
  briefings: FileText,
  tokens: Palette,
  agents: Repeat,
} as const;

export default function WerkwijzePage() {
  return (
    <div className="py-20">
      <Container className="max-w-3xl space-y-16">
        <Reveal>
          <header className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">
              {hero.eyebrow}
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {hero.title}
            </h1>
            <p className="text-lg text-muted-foreground">{hero.subtitle}</p>
          </header>
        </Reveal>

        <section className="space-y-6">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight">{principles.title}</h2>
          </Reveal>
          <div className="space-y-4">
            {principles.items.map((principle, index) => {
              const Icon = principleIcons[principle.key];
              return (
                <Reveal key={principle.key} delay={index * 0.06}>
                  <div className="flex gap-4 rounded-xl border border-border p-6">
                    <Icon className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
                    <div className="space-y-1">
                      <h3 className="font-semibold">{principle.title}</h3>
                      <p className="text-sm text-muted-foreground">{principle.body}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        <Reveal>
          <section className="space-y-4 rounded-xl border border-border bg-muted/40 p-6">
            <h2 className="text-xl font-semibold">{forYourTeam.title}</h2>
            <p className="text-muted-foreground">
              <RichText segments={forYourTeam.body} />
            </p>
          </section>
        </Reveal>

        <Reveal>
          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">{contact.title}</h2>
            <a
              href={site.contactHref}
              className={buttonVariants({ size: 'lg' })}
            >
              {contact.cta.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </section>
        </Reveal>
      </Container>
    </div>
  );
}
