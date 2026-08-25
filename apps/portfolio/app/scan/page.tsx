import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/ui/Reveal';
import { AccentBar } from '@/components/ui/AccentBar';
import { CheckList } from '@/components/ui/CheckList';
import { NumberedStep } from '@/components/data-display/NumberedStep';
import { copy } from '@/lib/copy';
import { site } from '@/lib/site';
import { buttonVariants } from '@umanex/ui/components/ui/button';
import { Card } from '@umanex/ui/components/ui/card';

export const metadata: Metadata = {
  title: copy.meta.scan.title,
  description: copy.meta.scan.description,
};

const { hero, deliverablesTitle, measures, notThis, how, contact } = copy.scan;

// Deze route staat bewust niet in de hoofdnav: het is de pagina die persoonlijk doorgestuurd
// wordt. Wel bereikbaar via de footer, de home-CTA en /aanbod.
export default function ScanPage() {
  return (
    <div className="py-20">
      <Container className="space-y-20">
        <Reveal>
          <header className="max-w-3xl space-y-5">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">
              {hero.eyebrow}
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{hero.title}</h1>
            <p className="text-lg text-muted-foreground">{hero.subtitle}</p>
            <div className="space-y-2">
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-3xl font-bold tracking-tight text-primary">
                  {hero.price}
                </span>
                <span className="text-sm text-muted-foreground">{hero.priceLabel}</span>
              </p>
              <p className="text-sm text-muted-foreground">{hero.priceExample}</p>
              <p className="max-w-xl text-sm text-muted-foreground">{hero.priceNote}</p>
            </div>
          </header>
        </Reveal>

        <section className="space-y-8">
          <Reveal>
            <AccentBar />
            <h2 className="text-2xl font-bold tracking-tight">{deliverablesTitle}</h2>
          </Reveal>
          <div className="grid gap-6 sm:grid-cols-2">
            <Reveal>
              <Card className="h-full space-y-4 rounded-xl bg-background p-6 shadow-none">
                <h3 className="font-semibold">{measures.title}</h3>
                <CheckList items={measures.items} tone="yes" />
              </Card>
            </Reveal>
            <Reveal delay={0.08}>
              <Card className="h-full space-y-4 rounded-xl bg-muted/40 p-6 shadow-none">
                <h3 className="font-semibold">{notThis.title}</h3>
                <CheckList items={notThis.items} tone="no" />
              </Card>
            </Reveal>
          </div>
        </section>

        <section className="space-y-8">
          <Reveal>
            <AccentBar />
            <h2 className="text-2xl font-bold tracking-tight">{how.title}</h2>
          </Reveal>
          <ol className="max-w-3xl space-y-6">
            {how.steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.06}>
                <NumberedStep number={index + 1} title={step.title} body={step.body} />
              </Reveal>
            ))}
          </ol>
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
              <a href={site.phoneHref} className="text-sm font-medium hover:text-foreground">
                {site.phone}
              </a>
            </div>
          </section>
        </Reveal>
      </Container>
    </div>
  );
}
