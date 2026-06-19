import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Card } from '@umanex/ui/components/ui/card';
import { badgeVariants } from '@umanex/ui/components/ui/badge';
import { cn } from '@umanex/ui/lib/utils';
import type { CaseStudy } from '@/lib/cases';

type Props = {
  caseStudy: CaseStudy;
};

export const CaseCard = ({ caseStudy }: Props) => (
  <Link href={`/cases/${caseStudy.slug}`} className="group block h-full">
    <Card className="flex h-full flex-col gap-3 rounded-xl p-6 shadow-none transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-primary/60 group-hover:shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {caseStudy.context}
        </p>
        <ArrowUpRight
          className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
          aria-hidden="true"
        />
      </div>
      <h3 className="text-xl font-semibold">{caseStudy.title}</h3>
      <p className="text-sm text-muted-foreground">{caseStudy.summary}</p>
      {caseStudy.stack.length > 0 && (
        <ul className="mt-auto flex flex-wrap gap-2 pt-2" aria-label="Stack">
          {caseStudy.stack.map((item) => (
            <li
              key={item}
              className={cn(badgeVariants({ variant: 'outline' }), 'border-transparent bg-accent text-accent-foreground')}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </Card>
  </Link>
);
