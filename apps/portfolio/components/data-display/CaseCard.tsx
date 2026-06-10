import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { CaseStudy } from '@/lib/cases';

type Props = {
  caseStudy: CaseStudy;
};

export const CaseCard = ({ caseStudy }: Props) => (
  <Link
    href={`/cases/${caseStudy.slug}`}
    className="group flex flex-col gap-3 rounded-lg border border-border bg-background p-6 transition-colors hover:border-primary"
  >
    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
      {caseStudy.context}
    </p>
    <h3 className="text-xl font-semibold">{caseStudy.title}</h3>
    <p className="text-sm text-muted-foreground">{caseStudy.summary}</p>
    <ul className="flex flex-wrap gap-2 pt-1" aria-label="Stack">
      {caseStudy.stack.map((item) => (
        <li
          key={item}
          className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
        >
          {item}
        </li>
      ))}
    </ul>
    <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-primary">
      Lees de case
      <ArrowRight
        className="h-4 w-4 transition-transform group-hover:translate-x-1"
        aria-hidden="true"
      />
    </span>
  </Link>
);
