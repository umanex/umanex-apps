import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/ui/Reveal';
import { CaseCard } from '@/components/data-display/CaseCard';
import { clientCases, ownWorkCases } from '@/lib/cases';

export const CasesTeaser = () => {
  const highlighted = [...clientCases.slice(0, 2), ...ownWorkCases.slice(0, 1)];

  return (
    <section className="border-t border-border py-20">
      <Container className="space-y-12">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl space-y-3">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Werk waar je iets aan hebt
              </h2>
              <p className="text-lg text-muted-foreground">
                Klantwerk in complexe B2B-omgevingen, en eigen werk dat de AI-werkwijze
                van begin tot eind toont.
              </p>
            </div>
            <Link
              href="/cases"
              className="text-sm font-medium text-primary hover:underline"
            >
              Alle cases
            </Link>
          </div>
        </Reveal>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {highlighted.map((caseStudy, index) => (
            <Reveal key={caseStudy.slug} delay={index * 0.08}>
              <CaseCard caseStudy={caseStudy} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
};
