import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/ui/Reveal';
import { CaseCard } from '@/components/data-display/CaseCard';
import { clientCases, ownWorkCases } from '@/lib/cases';

export const metadata: Metadata = {
  title: 'Cases',
  description:
    'Klantwerk bij onder meer Adhese, Luminus en Columba, en eigen werk dat de AI-werkwijze van briefing tot gelanceerd product toont.',
};

export default function CasesPage() {
  return (
    <div className="py-20">
      <Container className="space-y-16">
        <Reveal>
          <header className="max-w-2xl space-y-4">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Cases</h1>
            <p className="text-lg text-muted-foreground">
              Klantwerk in complexe B2B-omgevingen en eigen werk dat volledig toonbaar
              is — samen geven ze het eerlijkste beeld van hoe ik werk.
            </p>
          </header>
        </Reveal>

        <section className="space-y-8">
          <Reveal>
            <h2 className="text-xl font-semibold">Klantwerk</h2>
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
            <h2 className="text-xl font-semibold">Eigen werk</h2>
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
