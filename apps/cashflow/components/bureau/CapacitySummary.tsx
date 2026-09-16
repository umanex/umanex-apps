import Link from 'next/link';
import { cn } from '@umanex/ui/lib/utils';
import { focusRing } from '@umanex/ui/lib/focus';
import type { YearCapacity } from '../../lib/bureau/capacity';
import { CATEGORY_LABEL } from '../../lib/bureau/labels';
import { formatDays } from '../../lib/bureau/format';
import { CapacityBar } from './CapacityBar';

type CapacitySummaryProps = { capacity: YearCapacity | null; year: number };

/** Eigen tijd in het jaar: per categorie besteed, gepland en vrij, plus wat de buffer nog draagt. */
export function CapacitySummary({ capacity: c, year }: CapacitySummaryProps) {
  if (!c) {
    return (
      <section aria-labelledby="capaciteit-titel" className="rounded-xl border border-accent bg-card p-5">
        <h3 id="capaciteit-titel" className="text-base font-semibold">
          Capaciteit {year}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Zonder dagbudget valt er niets af te zetten.{' '}
          <Link href="/bureau/doelen" className={cn('rounded-sm font-medium text-foreground underline underline-offset-2', focusRing)}>
            Doelen voor {year} instellen
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="capaciteit-titel" className="space-y-4 rounded-xl border border-accent bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="capaciteit-titel" className="text-base font-semibold">
          Capaciteit {year}
        </h3>
        <p className="text-sm text-muted-foreground" data-capacity-line>
          besteed <span className="font-medium text-foreground tabular-nums">{formatDays(c.totals.spentDays)}</span> · gepland{' '}
          <span className="font-medium text-foreground tabular-nums">{formatDays(c.totals.plannedDays)}</span> · vrij{' '}
          <span className="font-medium text-foreground tabular-nums">{formatDays(Math.max(0, c.totals.freeDays))}</span> van {formatDays(c.totals.budgetDays)} · buffer{' '}
          <span className="font-medium text-foreground tabular-nums">{formatDays(c.buffer.remainingDays)}</span> over van {formatDays(c.buffer.budgetDays)}
          {c.overbookedDays > 0 && (
            <>
              {' '}· <span className="font-medium text-finance-negative">overbelast {formatDays(c.overbookedDays)}</span>
            </>
          )}
        </p>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        {c.categories.map((cat) => (
          <div key={cat.category} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <dt className="font-medium">{CATEGORY_LABEL[cat.category]}</dt>
              <dd className="tabular-nums text-muted-foreground">
                {formatDays(cat.spentDays)} + {formatDays(cat.plannedDays)} van {formatDays(cat.budgetDays)}
                {cat.overrunDays > 0 && <span className="ml-1 text-finance-negative">(+{formatDays(cat.overrunDays)})</span>}
              </dd>
            </div>
            <dd>
              <CapacityBar label={CATEGORY_LABEL[cat.category]} budget={cat.budgetDays} spent={cat.spentDays} planned={cat.plannedDays} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-full bg-foreground" /> besteed</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-full bg-chart-2" /> gepland (resterend)</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-full bg-finance-negative-surface" /> boven budget</span>
        {c.stalePlannedDays > 0 && <span>{formatDays(c.stalePlannedDays)} planning in voorbije periodes telt niet meer mee</span>}
        {c.futureEntries > 0 && <span>{c.futureEntries} registratie{c.futureEntries === 1 ? '' : 's'} met een datum na vandaag telt nog niet als besteed</span>}
      </p>
    </section>
  );
}
