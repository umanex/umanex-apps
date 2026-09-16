'use client';

import { Button } from '@umanex/ui/components/ui/button';
import type { IsoDate, Opportunity } from '../../lib/bureau/types';
import { STAGE_LABEL } from '../../lib/bureau/labels';
import { overdueActions, withoutNextAction } from '../../lib/bureau/pipeline';
import { dateLabel } from '../../lib/bureau/format';

type FollowUpListProps = { opportunities: Opportunity[]; today: IsoDate; graceDays: number; onOpen: (id: string) => void };

/** Wat vandaag opvolging vraagt: verlopen volgende acties (oudste eerst) en open kansen zonder volgende actie. */
export function FollowUpList({ opportunities, today, graceDays, onOpen }: FollowUpListProps) {
  const verlopen = overdueActions(opportunities, today, graceDays);
  const zonder = withoutNextAction(opportunities);
  if (verlopen.length === 0 && zonder.length === 0) return null;

  const rij = (o: Opportunity, tekst: string) => (
    <li key={o.id} data-follow-up={o.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1.5 text-dense">
      <span className="min-w-0">
        <span className="font-medium">{o.company}</span> <span className="text-muted-foreground">· {STAGE_LABEL[o.stage]} · {tekst}</span>
      </span>
      <Button size="sm" variant="ghost" aria-haspopup="dialog" aria-label={`Volg ${o.company} op`} onClick={() => onOpen(o.id)}>
        Opvolgen
      </Button>
    </li>
  );

  return (
    <section aria-labelledby="opvolgen-titel" className="space-y-2 rounded-xl border border-accent bg-card p-5">
      <h3 id="opvolgen-titel" className="text-base font-semibold">
        Opvolgen
      </h3>
      <ul className="divide-y divide-border">
        {verlopen.map(({ opportunity: o, daysOverdue }) =>
          rij(o, `${o.nextAction!.text}, gepland ${dateLabel(o.nextAction!.date)} — ${daysOverdue} ${daysOverdue === 1 ? 'dag' : 'dagen'} over tijd`),
        )}
        {zonder.map((o) => rij(o, 'geen volgende actie'))}
      </ul>
      {graceDays > 0 && <p className="text-xs text-muted-foreground">Marge {graceDays} {graceDays === 1 ? 'dag' : 'dagen'}, ingesteld bij de doelen.</p>}
    </section>
  );
}
