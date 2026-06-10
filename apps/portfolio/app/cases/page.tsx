import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { CaseCard } from '@/components/data-display/CaseCard';
import { caseStudies } from '@/lib/cases';

export const metadata: Metadata = {
  title: 'Cases',
  description:
    'Eigen producten, volledig gebouwd met de AI-werkwijze die umanex bij klanten inzet — van briefing tot werkende app.',
};

export default function CasesPage() {
  return (
    <section className="py-20">
      <Container className="space-y-10">
        <div className="max-w-2xl space-y-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Cases</h1>
          <p className="text-lg text-muted-foreground">
            Eigen producten, volledig gebouwd met de werkwijze die ik bij klanten inzet.
            Geen NDA — dus je ziet het echte werk, van probleem tot resultaat.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {caseStudies.map((caseStudy) => (
            <CaseCard key={caseStudy.slug} caseStudy={caseStudy} />
          ))}
        </div>
      </Container>
    </section>
  );
}
