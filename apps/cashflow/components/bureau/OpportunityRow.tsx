'use client';

import Link from 'next/link';
import { Button } from '@umanex/ui/components/ui/button';
import { cn } from '@umanex/ui/lib/utils';
import { focusRing } from '@umanex/ui/lib/focus';
import { formatCurrency } from '../../lib/cashflow/recurring';
import type { IsoDate, Opportunity, Project } from '../../lib/bureau/types';
import { OFFER_LABEL } from '../../lib/bureau/labels';
import { isOpen, qualification } from '../../lib/bureau/pipeline';
import { daysBetween } from '../../lib/bureau/periods';
import { dateLabel } from '../../lib/bureau/format';

type OpportunityRowProps = { opportunity: Opportunity; project?: Project; today: IsoDate; striped: boolean; onOpen: (id: string) => void };

/** Eén kans in de lijst: wie, wat, hoeveel, wat nu — en wat er aan kwalificatie ontbreekt, bij naam. */
export function OpportunityRow({ opportunity: o, project, today, striped, onOpen }: OpportunityRowProps) {
  const open = isOpen(o);
  const { qualified, missing } = qualification(o);
  const overTijd = o.nextAction ? daysBetween(o.nextAction.date, today) : 0;

  return (
    <li data-opportunity-row={o.id} className={cn('grid gap-x-4 gap-y-1 rounded-sm px-3 py-2 text-dense sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto] sm:items-center', striped && 'bg-muted')}>
      <div className="min-w-0">
        <p className="truncate font-medium">{o.company}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[o.contact, o.offerType ? OFFER_LABEL[o.offerType] : null].filter(Boolean).join(' · ') || 'Geen contact of aanbod'}
        </p>
      </div>
      <p className="tabular-nums sm:text-right">
        {o.expectedValue === null ? <span className="text-muted-foreground">Waarde onbekend</span> : formatCurrency(o.expectedValue)}
      </p>
      <div className="min-w-0 text-xs">
        {open ? (
          <>
            {o.nextAction ? (
              <p className="truncate">
                {o.nextAction.text} · {dateLabel(o.nextAction.date)}
                {overTijd > 0 && <span className="font-medium text-destructive"> · {overTijd} {overTijd === 1 ? 'dag' : 'dagen'} over tijd</span>}
              </p>
            ) : (
              <p className="font-medium text-destructive">Geen volgende actie</p>
            )}
            <p className="text-muted-foreground" data-missing={missing.join(',')}>
              {qualified ? 'Gekwalificeerd' : `Ontbreekt: ${missing.join(', ')}`}
            </p>
          </>
        ) : project ? (
          <p>
            Project{' '}
            <Link href={`/bureau/projecten/${project.id}`} className={cn('rounded-sm font-medium underline underline-offset-2', focusRing)}>
              {project.name}
            </Link>
          </p>
        ) : (
          <p className="text-muted-foreground">{o.outcomeReason ?? (o.stage === 'gewonnen' ? 'Nog geen project' : 'Geen reden genoteerd')}</p>
        )}
      </div>
      <div className="sm:justify-self-end">
        <Button size="sm" variant="outline" aria-haspopup="dialog" aria-label={`Open kans ${o.company}`} data-open-kans={o.id} onClick={() => onOpen(o.id)}>
          Openen
        </Button>
      </div>
    </li>
  );
}
