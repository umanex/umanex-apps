'use client';

import { useRef, useState, type FormEvent } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { Button } from '@umanex/ui/components/ui/button';
import { Input } from '@umanex/ui/components/ui/input';
import { Label } from '@umanex/ui/components/ui/label';
import { NativeSelect } from '@umanex/ui/components/ui/native-select';
import { cn } from '@umanex/ui/lib/utils';
import { useAnnounce, useBureau, useMutateBureau, useToday } from '../../hooks/useBureau';
import { useSyncStatus } from '../../lib/cashflow/sync-status';
import { TIME_LABELS, WORK_CATEGORIES, type TimeLabel, type WorkCategory } from '../../lib/bureau/types';
import { CATEGORY_LABEL, TIME_LABEL_LABEL } from '../../lib/bureau/labels';
import { addTimeEntry, type TimeEntryError } from '../../lib/bureau/mutations';
import { dayLabel, formatHours, parseNumber } from '../../lib/bureau/format';

const FOUT: Record<TimeEntryError, { veld: 'datum' | 'uren' | 'project'; tekst: string }> = {
  'datum-ongeldig': { veld: 'datum', tekst: 'Kies een datum.' },
  'uren-ongeldig': { veld: 'uren', tekst: 'Vul uren in tussen 0 en 24, bv. 1,5.' },
  'project-ontbreekt': { veld: 'project', tekst: 'Kies een project — klantwerk hoort bij een project.' },
  'project-onbekend': { veld: 'project', tekst: 'Dat project bestaat niet meer.' },
};

/**
 * Uren registreren zonder overlay. Enter registreert; daarna staat de focus weer op het urenveld en
 * blijven datum, categorie en project staan, zodat een dag in een paar toetsaanslagen vol staat.
 * Eigen actieve inzet — agent-looptijd en freelancer-uren horen hier niet.
 */
export function QuickTimeEntry() {
  const bureau = useBureau();
  const today = useToday();
  const mutate = useMutateBureau();
  const announce = useAnnounce();
  const conflict = useSyncStatus((s) => s.state) === 'conflict';
  const urenRef = useRef<HTMLInputElement>(null);
  const [datum, setDatum] = useState(today);
  const [categorie, setCategorie] = useState<WorkCategory>('klantwerk');
  const [projectId, setProjectId] = useState('');
  const [uren, setUren] = useState('');
  const [label, setLabel] = useState<TimeLabel | ''>('');
  const [notitie, setNotitie] = useState('');
  const [fout, setFout] = useState<{ veld: string; tekst: string } | null>(null);

  const actieveProjecten = bureau.projects.filter((p) => p.status === 'gepland' || p.status === 'lopend' || p.status === 'gepauzeerd' || p.id === projectId);
  const klantNaam = (clientId: string) => bureau.clients.find((c) => c.id === clientId)?.name ?? 'Onbekende klant';
  const gisteren = format(subDays(parseISO(today), 1), 'yyyy-MM-dd');

  const registreer = (e: FormEvent) => {
    e.preventDefault();
    const n = parseNumber(uren);
    const r = mutate((d) =>
      addTimeEntry(d, {
        id: crypto.randomUUID(),
        date: datum,
        category: categorie,
        projectId: categorie === 'klantwerk' ? projectId || null : null,
        hours: n ?? Number.NaN,
        label: label || null,
        note: notitie.trim(),
      }),
    );
    if (r !== 'ok') {
      setFout(FOUT[r]);
      document.getElementById(`tijd-${FOUT[r].veld}`)?.focus();
      return;
    }
    const project = bureau.projects.find((p) => p.id === projectId);
    announce(`${formatHours(n!)} geregistreerd op ${dayLabel(datum)} · ${CATEGORY_LABEL[categorie]}${categorie === 'klantwerk' && project ? ` · ${project.name}` : ''}.`);
    setUren('');
    setLabel('');
    setNotitie('');
    setFout(null);
    urenRef.current?.focus();
  };

  const veldFout = (veld: string) => (fout?.veld === veld ? fout.tekst : null);

  return (
    <form onSubmit={registreer} noValidate aria-labelledby="tijd-invoer-titel" className="space-y-4 rounded-xl border border-accent bg-card p-5">
      <h3 id="tijd-invoer-titel" className="text-base font-semibold">
        Uren registreren
      </h3>
      <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[auto_12rem_1fr_6rem_11rem]">
        <div className="flex flex-col gap-2">
          <Label htmlFor="tijd-datum">Datum</Label>
          <div className="flex gap-1">
            <Input id="tijd-datum" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} aria-invalid={veldFout('datum') ? true : undefined} className="w-40" />
            <Button type="button" size="sm" variant={datum === today ? 'secondary' : 'ghost'} className="h-10" onClick={() => setDatum(today)} aria-pressed={datum === today}>
              Vandaag
            </Button>
            <Button type="button" size="sm" variant={datum === gisteren ? 'secondary' : 'ghost'} className="h-10" onClick={() => setDatum(gisteren)} aria-pressed={datum === gisteren}>
              Gisteren
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tijd-categorie">Categorie</Label>
          <NativeSelect id="tijd-categorie" value={categorie} onChange={(e) => setCategorie(e.target.value as WorkCategory)}>
            {WORK_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tijd-project" className={cn(categorie !== 'klantwerk' && 'text-muted-foreground')}>
            Project
          </Label>
          <NativeSelect
            id="tijd-project"
            value={categorie === 'klantwerk' ? projectId : ''}
            disabled={categorie !== 'klantwerk'}
            onChange={(e) => setProjectId(e.target.value)}
            aria-invalid={veldFout('project') ? true : undefined}
            aria-describedby={veldFout('project') ? 'tijd-fout' : undefined}
          >
            <option value="">{categorie === 'klantwerk' ? (actieveProjecten.length ? 'Kies een project' : 'Nog geen projecten') : 'Alleen bij klantwerk'}</option>
            {actieveProjecten.map((p) => (
              <option key={p.id} value={p.id}>
                {klantNaam(p.clientId)} — {p.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tijd-uren">Uren</Label>
          <Input
            id="tijd-uren"
            ref={urenRef}
            inputMode="decimal"
            autoComplete="off"
            className="text-right tabular-nums"
            value={uren}
            onChange={(e) => setUren(e.target.value)}
            aria-invalid={veldFout('uren') ? true : undefined}
            aria-describedby={veldFout('uren') ? 'tijd-fout' : undefined}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tijd-label">Soort (optioneel)</Label>
          <NativeSelect id="tijd-label" value={label} onChange={(e) => setLabel(e.target.value as TimeLabel | '')}>
            <option value="">—</option>
            {TIME_LABELS.map((l) => (
              <option key={l} value={l}>
                {TIME_LABEL_LABEL[l]}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <Label htmlFor="tijd-notitie">Notitie (optioneel)</Label>
          <Input id="tijd-notitie" autoComplete="off" value={notitie} onChange={(e) => setNotitie(e.target.value)} />
        </div>
        <Button id="tijd-registreren" type="submit" disabled={conflict} aria-describedby={conflict ? 'tijd-conflict' : undefined}>
          Registreren
        </Button>
      </div>
      {conflict && (
        <p id="tijd-conflict" className="text-sm text-destructive">
          Eerst herladen — elders gewijzigd, er wordt niets bewaard.
        </p>
      )}
      {fout && (
        <p id="tijd-fout" className="text-sm text-destructive" role="alert">
          {fout.tekst}
        </p>
      )}
    </form>
  );
}
