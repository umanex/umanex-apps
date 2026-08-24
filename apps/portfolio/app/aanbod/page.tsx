import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/ui/Reveal';
import { AccentBar } from '@/components/ui/AccentBar';
import { CheckList } from '@/components/ui/CheckList';
import { NumberedStep } from '@/components/data-display/NumberedStep';
import { TierCard } from '@/components/data-display/TierCard';
import { copy } from '@/lib/copy';
import { site } from '@/lib/site';
import { buttonVariants } from '@umanex/ui/components/ui/button';
import { Card } from '@umanex/ui/components/ui/card';

export const metadata: Metadata = {
  title: copy.meta.aanbod.title,
  description: copy.meta.aanbod.description,
};

const { hero, fit, ladder, tiers, terms, anchor, contact } = copy.aanbod;

export default function AanbodPage() {
  return (
    <div className="py-20">
      <Container className="space-y-20">
        <Reveal>
          <header className="max-w-3xl space-y-4">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">
              {hero.eyebrow}
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{hero.title}</h1>
            <p className="text-lg text-muted-foreground">{hero.subtitle}</p>
          </header>
        </Reveal>

        <section className="space-y-8">
          <Reveal>
            <AccentBar />
            <h2 className="text-2xl font-bold tracking-tight">{fit.title}</h2>
          </Reveal>
          <div className="grid gap-6 sm:grid-cols-2">
            <Reveal>
              <Card className="h-full space-y-4 rounded-xl bg-background p-6 shadow-none">
                <h3 className="font-semibold">{fit.forTitle}</h3>
                <CheckList items={fit.forItems} tone="yes" />
              </Card>
            </Reveal>
            <Reveal delay={0.08}>
              <Card className="h-full space-y-4 rounded-xl bg-muted/40 p-6 shadow-none">
                <h3 className="font-semibold">{fit.againstTitle}</h3>
                <CheckList items={fit.againstItems} tone="no" />
              </Card>
            </Reveal>
          </div>
        </section>

        <section className="space-y-8">
          <Reveal>
            <div className="max-w-3xl space-y-3">
              <AccentBar />
              <h2 className="text-2xl font-bold tracking-tight">{ladder.title}</h2>
              <p className="text-lg text-muted-foreground">{ladder.intro}</p>
            </div>
          </Reveal>
          <ol className="max-w-3xl space-y-6">
            {ladder.steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.06}>
                <NumberedStep
                  number={index + 1}
                  title={step.title}
                  meta={step.meta}
                  body={step.body}
                  link={'link' in step ? step.link : undefined}
                />
              </Reveal>
            ))}
          </ol>
        </section>

        <section className="space-y-8">
          <Reveal>
            <div className="max-w-3xl space-y-3">
              <AccentBar />
              <h2 className="text-2xl font-bold tracking-tight">{tiers.title}</h2>
              <p className="text-lg text-muted-foreground">{tiers.intro}</p>
            </div>
          </Reveal>
          <div className="grid gap-6 lg:grid-cols-3">
            {tiers.items.map((tier, index) => (
              <Reveal key={tier.name} delay={index * 0.08}>
                <TierCard name={tier.name} days={tier.days} body={tier.body} />
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="max-w-3xl text-sm text-muted-foreground">{tiers.note}</p>
          </Reveal>
        </section>

        <section className="space-y-6">
          <Reveal>
            <AccentBar />
            <h2 className="text-2xl font-bold tracking-tight">{terms.title}</h2>
          </Reveal>
          <Reveal>
            <ul className="max-w-3xl space-y-4 border-l-2 border-border pl-6">
              {terms.items.map((term) => (
                <li key={term} className="text-muted-foreground">
                  {term}
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        <section className="space-y-6">
          <Reveal>
            <AccentBar />
            <h2 className="text-2xl font-bold tracking-tight">{anchor.title}</h2>
          </Reveal>
          <Reveal>
            <div className="max-w-3xl space-y-4">
              {anchor.body.map((paragraph) => (
                <p key={paragraph} className="text-muted-foreground">
                  {paragraph}
                </p>
              ))}
              <p className="text-sm text-muted-foreground/80">{anchor.source}</p>
            </div>
          </Reveal>
        </section>

        <Reveal>
          <section className="space-y-5 border-t border-border pt-12">
            <h2 className="text-2xl font-bold tracking-tight">{contact.title}</h2>
            <p className="max-w-2xl text-lg text-muted-foreground">{contact.body}</p>
            <div className="flex flex-wrap items-center gap-4">
              <a href={site.scanHref} className={buttonVariants({ size: 'lg' })}>
                {contact.cta.label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <Link
                href={contact.secondaryCta.href}
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                {contact.secondaryCta.label}
              </Link>
            </div>
          </section>
        </Reveal>
      </Container>
    </div>
  );
}
