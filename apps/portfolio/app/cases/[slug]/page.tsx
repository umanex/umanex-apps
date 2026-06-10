import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { caseStudies, getCaseStudy } from '@/lib/cases';

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
    title: `${caseStudy.title} — case`,
    description: caseStudy.summary,
  };
}

export default function CaseDetailPage({ params }: Props) {
  const caseStudy = getCaseStudy(params.slug);
  if (!caseStudy) {
    notFound();
  }

  const sections = [
    { heading: 'Het probleem', body: caseStudy.problem },
    { heading: 'De aanpak', body: caseStudy.approach },
    { heading: 'Het resultaat', body: caseStudy.result },
  ];

  return (
    <article className="py-20">
      <Container className="max-w-3xl space-y-10">
        <Link
          href="/cases"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Alle cases
        </Link>
        <header className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            {caseStudy.context}
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {caseStudy.title}
          </h1>
          <p className="text-lg text-muted-foreground">{caseStudy.summary}</p>
          <ul className="flex flex-wrap gap-2" aria-label="Stack">
            {caseStudy.stack.map((item) => (
              <li
                key={item}
                className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
        </header>
        {sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h2 className="text-xl font-semibold">{section.heading}</h2>
            <p className="text-muted-foreground">{section.body}</p>
          </section>
        ))}
      </Container>
    </article>
  );
}
