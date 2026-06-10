import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { CaseCard } from '@/components/data-display/CaseCard';
import { caseStudies } from '@/lib/cases';

export const CasesTeaser = () => (
  <section className="py-20">
    <Container className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl space-y-4">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Werk dat je kan bekijken
          </h2>
          <p className="text-lg text-muted-foreground">
            Eigen producten, volledig gebouwd met de werkwijze die ik bij klanten inzet
            — geen NDA, dus alles toonbaar.
          </p>
        </div>
        <Link href="/cases" className="text-sm font-medium text-primary hover:underline">
          Alle cases
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {caseStudies.map((caseStudy) => (
          <CaseCard key={caseStudy.slug} caseStudy={caseStudy} />
        ))}
      </div>
    </Container>
  </section>
);
