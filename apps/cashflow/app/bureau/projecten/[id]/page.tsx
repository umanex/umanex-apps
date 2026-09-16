'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@umanex/ui/components/ui/badge';
import { Button } from '@umanex/ui/components/ui/button';
import { cn } from '@umanex/ui/lib/utils';
import { focusRing } from '@umanex/ui/lib/focus';
import { formatCurrency } from '../../../../lib/cashflow/recurring';
import { useBureau, useBureauYear } from '../../../../hooks/useBureau';
import { goalsFor, hoursPerDayFor, revenuePerDayTarget } from '../../../../lib/bureau/goals';
import { projectProfitability } from '../../../../lib/bureau/profitability';
import { bucketMilestones } from '../../../../lib/bureau/revenue';
import { OFFER_LABEL } from '../../../../lib/bureau/labels';
import { formatHours } from '../../../../lib/bureau/format';
import { EmptyState } from '../../../../components/feedback/EmptyState';
import { ProjectSheet } from '../../../../components/bureau/ProjectSheet';
import { ProjectStatusBadge } from '../../../../components/bureau/ProjectStatusBadge';
import { YieldBreakdown } from '../../../../components/bureau/YieldBreakdown';
import { MilestoneList } from '../../../../components/bureau/MilestoneList';
import { ExtensionList } from '../../../../components/bureau/ExtensionList';
import { ExternalCostList } from '../../../../components/bureau/ExternalCostList';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bureau = useBureau();
  const [year] = useBureauYear();
  const p = bureau.projects.find((x) => x.id === id);
  const thisYear = new Date().getFullYear();
  const uurPerDag = hoursPerDayFor(bureau, thisYear);

  const cijfers = useMemo(() => {
    if (!p) return null;
    const eigen = bucketMilestones(bureau).buckets.filter((b) => b.projectId === p.id && b.year === year);
    return {
      rendement: projectProfitability(p, bureau.timeEntries, uurPerDag),
      gerealiseerd: eigen.filter((b) => b.kind === 'gerealiseerd').reduce((s, b) => s + b.amount, 0),
      resterend: eigen.filter((b) => b.kind === 'resterend').reduce((s, b) => s + b.amount, 0),
    };
  }, [bureau, p, year, uurPerDag]);

  const terug = (
    <Link href="/bureau/projecten" className={cn('inline-flex rounded-sm text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline', focusRing)}>
      ← Alle projecten
    </Link>
  );

  if (!p || !cijfers) {
    return (
      <section className="space-y-4">
        {terug}
        <EmptyState title="Project niet gevonden">Dit project bestaat niet (meer) in je gegevens. Het kan elders verwijderd zijn.</EmptyState>
      </section>
    );
  }

  const klant = bureau.clients.find((c) => c.id === p.clientId);
  const goals = goalsFor(bureau, thisYear);
  const r = cijfers.rendement;

  return (
    <article aria-labelledby="project-titel" className="space-y-5">
      {terug}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 id="project-titel" className="text-xl font-semibold">
            {p.name}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{klant?.name ?? 'Onbekende klant'}</span>
            <Badge variant="outline">{OFFER_LABEL[p.offerType]}</Badge>
            <ProjectStatusBadge status={p.status} />
            <span className="tabular-nums">
              uitvoering {p.plannedStart} – {p.plannedEnd} · getekend {p.contractDate}
            </span>
          </div>
        </div>
        <ProjectSheet trigger={<Button variant="outline">Bewerken</Button>} project={p} />
      </header>

      <dl className="grid gap-4 rounded-xl border border-accent bg-card p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Goedgekeurde prijs (ex btw)</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(r.approvedTotal)}</dd>
          <dd className="text-xs text-muted-foreground">
            vast {formatCurrency(p.fixedPriceExVat)}{p.extensions.length ? ` + ${p.extensions.length} uitbreiding${p.extensions.length === 1 ? '' : 'en'}` : ''}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Omzet in {year}</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(cijfers.gerealiseerd)}</dd>
          <dd className="text-xs text-muted-foreground">gerealiseerd · nog {formatCurrency(cijfers.resterend)} getekend resterend</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Eigen uren</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">{formatHours(r.spentHours)}</dd>
          <dd className="text-xs text-muted-foreground">
            {r.hours.budgeted === null ? 'niet begroot' : `van ${formatHours(r.hours.budgeted)} begroot`}
            {r.hours.expectedTotal !== null && ` · verwacht totaal ${formatHours(r.hours.expectedTotal)}`}
          </dd>
          {r.hours.overrun !== null && r.hours.overrun > 0 && <dd className="text-xs text-finance-negative">uitloop {formatHours(r.hours.overrun)}</dd>}
        </div>
        <div>
          <dt className="text-muted-foreground">Volgende mijlpaal</dt>
          <dd className="mt-1">{p.nextMilestoneNote || <span className="text-muted-foreground">niet ingevuld</span>}</dd>
          <dt className="mt-2 text-muted-foreground">Blokkades en open klantinput</dt>
          <dd className="mt-1 whitespace-pre-line">{p.blockers || <span className="text-muted-foreground">geen</span>}</dd>
        </div>
      </dl>

      {p.scope && (
        <section aria-labelledby="project-scope" className="rounded-xl border border-accent bg-card p-5">
          <h3 id="project-scope" className="text-base font-semibold">
            Scope
          </h3>
          <p className="mt-2 max-w-prose whitespace-pre-line text-sm">{p.scope}</p>
        </section>
      )}

      <YieldBreakdown row={r} hoursPerDay={uurPerDag} targetA={goals ? revenuePerDayTarget(goals) : null} targetB={goals?.targetMarginPerDay ?? null} status={p.status === 'afgerond' ? 'afgerond' : 'anders'} />
      <MilestoneList project={p} />
      <ExtensionList project={p} />
      <ExternalCostList project={p} />
    </article>
  );
}
