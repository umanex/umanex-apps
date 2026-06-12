import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/ui/Reveal';
import { AccentBar } from '@/components/ui/AccentBar';
import { CaseCard } from '@/components/data-display/CaseCard';
import { clientCases, ownWorkCases } from '@/lib/cases';
import { copy } from '@/lib/copy';

export const metadata: Metadata = {
  title: copy.meta.cases.title,
  description: copy.meta.cases.description,
};

export default function CasesPage() {
  return (
    <div className="py-20">
      <Container className="space-y-16">
        <Reveal>
          <header className="max-w-2xl space-y-4">
            <AccentBar />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {copy.cases.hero.title}
            </h1>
            <p className="text-lg text-muted-foreground">{copy.cases.hero.subtitle}</p>
          </header>
        </Reveal>

        <section className="space-y-8">
          <Reveal>
            <h2 className="text-xl font-semibold">{copy.cases.clientWorkTitle}</h2>
          </Reveal>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {clientCases.map((caseStudy, index) => (
              <Reveal key={caseStudy.slug} delay={index * 0.08}>
                <CaseCard caseStudy={caseStudy} />
              </Reveal>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <Reveal>
            <h2 className="text-xl font-semibold">{copy.cases.ownWorkTitle}</h2>
          </Reveal>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ownWorkCases.map((caseStudy, index) => (
              <Reveal key={caseStudy.slug} delay={index * 0.08}>
                <CaseCard caseStudy={caseStudy} />
              </Reveal>
            ))}
          </div>
        </section>
      </Container>
    </div>
  );
}
