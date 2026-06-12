import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/ui/Reveal';
import { PlaceholderNote } from '@/components/feedback/PlaceholderNote';
import { caseStudies, getCaseStudy } from '@/lib/cases';
import { copy } from '@/lib/copy';

type Props = {
  params: { slug: string };
};

export function generateStaticParams() {
  return caseStudies.map((caseStudy) => ({ slug: caseStudy.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const caseStudy = getCaseStudy(params.slug);
  if (!caseStudy) {
    return {};
  }
  return {
    title: `${caseStudy.title} ${copy.caseDetail.metaTitleSuffix}`,
    description: caseStudy.summary,
  };
}

export default function CaseDetailPage({ params }: Props) {
  const caseStudy = getCaseStudy(params.slug);
  if (!caseStudy) {
    notFound();
  }

  const sections = [
    { heading: copy.caseDetail.sections.problem, body: caseStudy.problem },
    { heading: copy.caseDetail.sections.approach, body: caseStudy.approach },
    { heading: copy.caseDetail.sections.result, body: caseStudy.result },
  ];

  return (
    <article className="py-20">
      <Container className="max-w-3xl space-y-10">
        <Reveal>
          <Link
            href="/cases"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {copy.caseDetail.backLabel}
          </Link>
        </Reveal>
        <Reveal>
          <header className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">
              {caseStudy.context}
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {caseStudy.title}
            </h1>
            <p className="text-lg text-muted-foreground">{caseStudy.summary}</p>
            {caseStudy.stack.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label={copy.caseDetail.stackLabel}>
                {caseStudy.stack.map((item) => (
                  <li
                    key={item}
                    className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
            {caseStudy.draft && (
              <PlaceholderNote>{copy.caseDetail.draftNote}</PlaceholderNote>
            )}
          </header>
        </Reveal>
        {sections.map((section, index) => (
          <Reveal key={section.heading} delay={index * 0.05}>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">{section.heading}</h2>
              <p className="text-muted-foreground">{section.body}</p>
            </section>
          </Reveal>
        ))}
      </Container>
    </article>
  );
}
