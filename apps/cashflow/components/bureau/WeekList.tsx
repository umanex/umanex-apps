'use client';

import { useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { cn } from '@umanex/ui/lib/utils';
import { focusRing } from '@umanex/ui/lib/focus';
import { useAnnounce, useBureau, useMutateBureau, useToday } from '../../hooks/useBureau';
import { useSyncStatus } from '../../lib/cashflow/sync-status';
import { WORK_CATEGORIES } from '../../lib/bureau/types';
import { CATEGORY_LABEL } from '../../lib/bureau/labels';
import { removeTimeEntry, updateTimeEntry } from '../../lib/bureau/mutations';
import { entryDays } from '../../lib/bureau/profitability';
import { dayLabel, formatDays, formatHours, weekLabel } from '../../lib/bureau/format';
import { isoWeekKey, weekRange } from '../../lib/bureau/periods';
import { EmptyState } from '../feedback/EmptyState';
import { TimeEntryRow } from './TimeEntryRow';

/** De registraties van één week, per dag, met een weektotaal per categorie. */
export function WeekList() {
  const bureau = useBureau();
  const today = useToday();
  const mutate = useMutateBureau();
  const announce = useAnnounce();
  const conflict = useSyncStatus((s) => s.state) === 'conflict';
  const [week, setWeek] = useState(isoWeekKey(today));
  const { from, to } = weekRange(week);
  const verschuif = (dagen: number) => setWeek(isoWeekKey(format(addDays(parseISO(from), dagen), 'yyyy-MM-dd')));

  const inWeek = bureau.timeEntries.filter((e) => e.date >= from && e.date <= to).sort((a, b) => a.date.localeCompare(b.date));
  const dagen = [...new Set(inWeek.map((e) => e.date))];
  const totaalUren = inWeek.reduce((s, e) => s + e.hours, 0);
  const totaalDagen = inWeek.reduce((s, e) => s + entryDays(e), 0);
  const knop = cn('flex h-9 w-9 items-center justify-center border border-input bg-background text-sm transition-colors hover:bg-muted', focusRing);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center">
          <button type="button" className={cn(knop, 'rounded-l-md')} onClick={() => verschuif(-7)} aria-label="Een week terug">
            ←
          </button>
          <button type="button" className={cn(knop, 'rounded-r-md border-l-0')} onClick={() => verschuif(7)} aria-label="Een week vooruit">
            →
          </button>
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite" data-week-label>
          {weekLabel(week)}
        </p>
        {week !== isoWeekKey(today) && (
          <button type="button" onClick={() => setWeek(isoWeekKey(today))} className={cn('h-9 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted', focusRing)}>
            Deze week
          </button>
        )}
      </div>

      {inWeek.length === 0 ? (
        <EmptyState title={`Nog geen uren in week ${Number(week.slice(6))}`} headingLevel="h3">
          Registreer per dag de categorie, de uren en bij klantwerk het project. Capaciteit en rendement rekenen hiermee.
        </EmptyState>
      ) : (
        <>
          {dagen.map((dag) => {
            const regels = inWeek.filter((e) => e.date === dag);
            return (
              <section key={dag} aria-labelledby={`dag-${dag}`} className="space-y-1">
                <h4 id={`dag-${dag}`} className="text-sm font-semibold">
                  {dayLabel(dag)} · <span className="tabular-nums">{formatHours(regels.reduce((s, e) => s + e.hours, 0))}</span>
                </h4>
                <ul className="space-y-0.5">
                  {regels.map((e, i) => (
                    <TimeEntryRow
                      key={e.id}
                      entry={e}
                      project={bureau.projects.find((p) => p.id === e.projectId)}
                      striped={i % 2 === 1}
                      disabled={conflict}
                      onSaveHours={(hours, note) => {
                        const r = mutate((d) => updateTimeEntry(d, e.id, { hours, note }));
                        if (r === 'ok') { announce(`Registratie bijgewerkt naar ${formatHours(hours)}.`); return null; }
                        return r === 'uren-ongeldig' ? 'Tussen 0 en 24 uur.' : 'Niet bewaard.';
                      }}
                      onRemove={() => {
                        mutate((d) => removeTimeEntry(d, e.id));
                        announce(`Registratie van ${formatHours(e.hours)} op ${dayLabel(e.date)} verwijderd.`);
                      }}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
          <p className="border-t border-border pt-3 text-sm text-muted-foreground" data-week-total>
            {WORK_CATEGORIES.map((c) => {
              const u = inWeek.filter((e) => e.category === c).reduce((s, e) => s + e.hours, 0);
              return u > 0 ? `${CATEGORY_LABEL[c]} ${formatHours(u)} · ` : '';
            }).join('')}
            totaal <span className="font-medium text-foreground tabular-nums">{formatHours(totaalUren)}</span> = <span className="tabular-nums">{formatDays(totaalDagen)}</span>
          </p>
        </>
      )}
    </div>
  );
}
