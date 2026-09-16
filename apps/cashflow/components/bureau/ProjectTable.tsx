'use client';

import Link from 'next/link';
import { cn } from '@umanex/ui/lib/utils';
import { focusRing } from '@umanex/ui/lib/focus';
import { formatCurrency } from '../../lib/cashflow/recurring';
import type { Client, Project } from '../../lib/bureau/types';
import type { ProjectProfitability } from '../../lib/bureau/profitability';
import { OFFER_LABEL } from '../../lib/bureau/labels';
import { formatHours, monthRangeLabel } from '../../lib/bureau/format';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { MetricValue } from './MetricValue';

export type ProjectRow = {
  project: Project;
  client: Client | undefined;
  approved: number;
  realizedInYear: number;
  remainingInYear: number;
  profitability: ProjectProfitability;
  /** Goedgekeurde prijs min Σ mijlpalen; 0 = volledig uitgesplitst. */
  coverageDelta: number;
};

type ProjectTableProps = { rows: ProjectRow[]; year: number; caption: string };

/** Projecten als dichte tabel. Scrollt binnen zichzelf op een smal scherm, de pagina niet. */
export function ProjectTable({ rows, year, caption }: ProjectTableProps) {
  const th = 'px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap';
  const td = 'px-3 py-2 align-top';
  return (
    <div data-scroll-x className="overflow-x-auto rounded-xl border border-accent bg-card">
      <table className="w-full min-w-[56rem] text-dense">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-border">
          <tr>
            <th scope="col" className={th}>Project</th>
            <th scope="col" className={th}>Status</th>
            <th scope="col" className={th}>Uitvoering</th>
            <th scope="col" className={cn(th, 'text-right')}>Prijs</th>
            <th scope="col" className={cn(th, 'text-right')}>Gerealiseerd {year}</th>
            <th scope="col" className={cn(th, 'text-right')}>Resterend {year}</th>
            <th scope="col" className={cn(th, 'text-right')}>Uren</th>
            <th scope="col" className={th}>A · omzet/dag</th>
            <th scope="col" className={th}>B · na externe kosten</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ project: p, client, approved, realizedInYear, remainingInYear, profitability: r, coverageDelta }, i) => (
            <tr key={p.id} data-project-row={p.id} className={cn('border-b border-border last:border-0', i % 2 === 1 && 'bg-muted')}>
              <th scope="row" className={cn(td, 'text-left font-normal')}>
                <Link href={`/bureau/projecten/${p.id}`} className={cn('rounded-sm font-medium underline-offset-2 hover:underline', focusRing)}>
                  {p.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {client?.name ?? 'Onbekende klant'} · {OFFER_LABEL[p.offerType]}
                </p>
              </th>
              <td className={td}>
                <ProjectStatusBadge status={p.status} />
              </td>
              <td className={cn(td, 'whitespace-nowrap tabular-nums')}>
                {monthRangeLabel(p.plannedStart, p.plannedEnd)}
              </td>
              <td className={cn(td, 'text-right tabular-nums')}>
                {formatCurrency(approved)}
                {p.milestones.length === 0 ? (
                  <p className="text-xs text-finance-deferred">geen mijlpalen</p>
                ) : Math.abs(coverageDelta) > 0.005 ? (
                  <p className="text-xs text-finance-deferred">{formatCurrency(Math.abs(coverageDelta))} {coverageDelta > 0 ? 'niet ingepland' : 'te veel ingepland'}</p>
                ) : null}
              </td>
              {p.milestones.length === 0 ? (
                <>
                  <td className={cn(td, 'text-right text-muted-foreground')} data-realized={0} data-onvoldoende>Onvoldoende gegevens</td>
                  <td className={cn(td, 'text-right text-muted-foreground')} data-onvoldoende>Onvoldoende gegevens</td>
                </>
              ) : (
                <>
                  <td className={cn(td, 'text-right tabular-nums')} data-realized={realizedInYear}>{formatCurrency(realizedInYear)}</td>
                  <td className={cn(td, 'text-right tabular-nums')}>{formatCurrency(remainingInYear)}</td>
                </>
              )}
              <td className={cn(td, 'whitespace-nowrap text-right tabular-nums')}>
                {formatHours(r.spentHours)}
                <p className="text-xs text-muted-foreground">{r.hours.budgeted === null ? 'niet begroot' : `van ${formatHours(r.hours.budgeted)}`}</p>
                {r.hours.overrun !== null && r.hours.overrun > 0 && <p className="text-xs text-finance-negative">uitloop {formatHours(r.hours.overrun)}</p>}
              </td>
              <td className={td}>
                <MetricValue metric={r.A} />
              </td>
              <td className={td}>
                <MetricValue metric={r.B} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
