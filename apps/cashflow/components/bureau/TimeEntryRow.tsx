'use client';

import { useState } from 'react';
import { Button } from '@umanex/ui/components/ui/button';
import { Input } from '@umanex/ui/components/ui/input';
import { cn } from '@umanex/ui/lib/utils';
import type { Project, TimeEntry } from '../../lib/bureau/types';
import { CATEGORY_LABEL, TIME_LABEL_LABEL } from '../../lib/bureau/labels';
import { formatHours, parseNumber, toInputValue } from '../../lib/bureau/format';

type TimeEntryRowProps = {
  entry: TimeEntry;
  project: Project | undefined;
  striped: boolean;
  disabled: boolean;
  onSaveHours: (hours: number, note: string) => string | null;
  onRemove: () => void;
};

/** Eén registratie in de weeklijst. Bewerken past uren en notitie aan; de uren-per-dag van toen blijven. */
export function TimeEntryRow({ entry: e, project, striped, disabled, onSaveHours, onRemove }: TimeEntryRowProps) {
  const [bewerk, setBewerk] = useState(false);
  const [uren, setUren] = useState(toInputValue(e.hours));
  const [notitie, setNotitie] = useState(e.note);
  const [fout, setFout] = useState<string | null>(null);

  const opslaan = () => {
    const n = parseNumber(uren);
    if (n === null) return setFout('Geen getal — bv. 1,5.');
    const r = onSaveHours(n, notitie.trim());
    if (r) return setFout(r);
    setFout(null);
    setBewerk(false);
  };

  return (
    <li data-time-entry={e.id} className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm px-2 py-1.5 text-dense', striped && 'bg-muted')}>
      <span className="min-w-0 flex-1">
        <span className="font-medium">{e.category === 'klantwerk' ? project?.name ?? 'Onbekend project' : CATEGORY_LABEL[e.category]}</span>
        {e.label && <span className="ml-2 text-muted-foreground">· {TIME_LABEL_LABEL[e.label]}</span>}
        {!bewerk && e.note && <span className="ml-2 text-muted-foreground">· {e.note}</span>}
      </span>
      {bewerk ? (
        <span className="flex flex-wrap items-center gap-2">
          <Input aria-label="Notitie" className="h-8 w-48" value={notitie} onChange={(ev) => setNotitie(ev.target.value)} />
          <Input
            aria-label="Uren"
            inputMode="decimal"
            className="h-8 w-20 text-right tabular-nums"
            value={uren}
            onChange={(ev) => setUren(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter') { ev.preventDefault(); opslaan(); }
              if (ev.key === 'Escape') { setBewerk(false); setFout(null); }
            }}
          />
          <Button size="sm" onClick={opslaan} disabled={disabled}>OK</Button>
          <Button size="sm" variant="ghost" onClick={() => { setBewerk(false); setFout(null); }}>Annuleren</Button>
          {fout && <span className="w-full text-xs text-destructive" role="alert">{fout}</span>}
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <span className="w-16 text-right font-semibold tabular-nums">{formatHours(e.hours)}</span>
          <Button size="sm" variant="ghost" onClick={() => setBewerk(true)} disabled={disabled} aria-label={`Bewerk registratie van ${formatHours(e.hours)}`}>
            Bewerken
          </Button>
          <Button size="sm" variant="ghost" onClick={onRemove} disabled={disabled} aria-label={`Verwijder registratie van ${formatHours(e.hours)}`}>
            Verwijderen
          </Button>
        </span>
      )}
    </li>
  );
}
