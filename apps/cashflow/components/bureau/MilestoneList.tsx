'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@umanex/ui/components/ui/button';
import { Input } from '@umanex/ui/components/ui/input';
import { Label } from '@umanex/ui/components/ui/label';
import { NativeSelect } from '@umanex/ui/components/ui/native-select';
import { formatCurrency } from '../../lib/cashflow/recurring';
import { useAnnounce, useMutateBureau, useToday } from '../../hooks/useBureau';
import { useSyncStatus } from '../../lib/cashflow/sync-status';
import type { Project } from '../../lib/bureau/types';
import { coverage } from '../../lib/bureau/revenue';
import { addMonthlyMilestones, realizeMilestone, removeMilestone, unrealizeMilestone, upsertMilestone } from '../../lib/bureau/mutations';
import { monthsBetween } from '../../lib/bureau/periods';
import { parseNumber } from '../../lib/bureau/format';
import { SumLine } from './SumLine';
import { MilestoneRow } from './MilestoneRow';

/**
 * De omzetplanning van een project. Een mijlpaal is gerealiseerd of niet; zo telt hij in het jaar
 * van zijn realisatie of van zijn geplande maand, en nooit in beide.
 */
export function MilestoneList({ project: p }: { project: Project }) {
  const mutate = useMutateBureau();
  const announce = useAnnounce();
  const today = useToday();
  const conflict = useSyncStatus((s) => s.state) === 'conflict';
  const [label, setLabel] = useState('');
  const [maand, setMaand] = useState(p.plannedStart);
  const [bedrag, setBedrag] = useState('');
  const [uitbreiding, setUitbreiding] = useState('');
  const [fout, setFout] = useState<string | null>(null);
  const dekking = coverage(p);
  const maanden = monthsBetween(p.plannedStart, p.plannedEnd);

  const toevoegen = (e: FormEvent) => {
    e.preventDefault();
    const n = parseNumber(bedrag);
    if (!label.trim()) return setFout('Geef de mijlpaal een omschrijving.');
    if (!/^\d{4}-\d{2}$/.test(maand)) return setFout('Kies de geplande maand.');
    if (n === null || n < 0) return setFout('Het bedrag is geen getal van 0 of meer — bv. 4.000.');
    mutate((d) => upsertMilestone(d, p.id, { id: crypto.randomUUID(), label: label.trim(), plannedMonth: maand, amount: n, realizedOn: null, realizedAmount: null, extensionId: uitbreiding || null }));
    announce(`Mijlpaal ${label.trim()} toegevoegd.`);
    setLabel('');
    setBedrag('');
    setFout(null);
    document.getElementById(`mijlpaal-nieuw-label-${p.id}`)?.focus();
  };

  const maandelijks = () => {
    const r = mutate((d) => addMonthlyMilestones(d, p.id, maanden.map(() => crypto.randomUUID()), (m) => `Capaciteit ${m}`));
    announce(r === 'ok' ? `${maanden.length} maandmijlpalen aangemaakt.` : 'Maandmijlpalen niet aangemaakt.');
  };

  return (
    <section aria-labelledby={`mijlpalen-${p.id}`} className="space-y-3 rounded-xl border border-accent bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`mijlpalen-${p.id}`} className="text-base font-semibold">
          Mijlpalen en omzetplanning
        </h3>
        {p.milestones.length > 0 && (
          <SumLine
            label="Mijlpalen"
            sum={formatCurrency(dekking.planned)}
            against={`goedgekeurd ${formatCurrency(dekking.approved)}`}
            deviation={Math.abs(dekking.delta) > 0.005 ? `${dekking.delta > 0 ? '−' : '+'}${formatCurrency(Math.abs(dekking.delta))}` : null}
          />
        )}
      </div>

      {p.milestones.length === 0 ? (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p className="max-w-prose">
            Nog geen mijlpalen: dit project telt dan in geen enkel jaar als omzet of resterend getekend werk. Splits de prijs op in mijlpalen, of — voor capaciteit in dagen per maand — één mijlpaal per maand.
          </p>
          {maanden.length > 0 && (
            <Button variant="outline" onClick={maandelijks} disabled={conflict}>
              Maandmijlpalen aanmaken ({maanden.length} × {formatCurrency(dekking.approved / maanden.length)})
            </Button>
          )}
        </div>
      ) : (
        <div data-scroll-x className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-dense">
            <caption className="sr-only">Mijlpalen van {p.name}</caption>
            <thead className="border-b border-border">
              <tr>
                {['Omschrijving', 'Geplande maand', 'Bedrag (ex btw)', 'Gerealiseerd', 'Acties'].map((h, i) => (
                  <th key={h} scope="col" className={`px-3 py-2 text-xs font-medium text-muted-foreground ${i === 2 || i === 4 ? 'text-right' : 'text-left'}`}>
                    {i === 4 ? <span className="sr-only">{h}</span> : h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...p.milestones]
                .sort((a, b) => a.plannedMonth.localeCompare(b.plannedMonth))
                .map((m, i) => (
                  <MilestoneRow
                    key={m.id}
                    milestone={m}
                    extension={p.extensions.find((x) => x.id === m.extensionId)}
                    striped={i % 2 === 1}
                    today={today}
                    disabled={conflict}
                    onSave={(nieuw) => mutate((d) => upsertMilestone(d, p.id, nieuw))}
                    onRealize={(ja) => {
                      mutate((d) => (ja ? realizeMilestone(d, p.id, m.id, today, null) : unrealizeMilestone(d, p.id, m.id)));
                      announce(ja ? `${m.label} gerealiseerd op ${today}.` : `${m.label} niet meer gerealiseerd.`);
                    }}
                    onRemove={() => {
                      mutate((d) => removeMilestone(d, p.id, m.id));
                      announce(`Mijlpaal ${m.label} verwijderd.`);
                    }}
                  />
                ))}
            </tbody>
          </table>
        </div>
      )}
      {p.milestones.some((m) => m.realizedOn !== null) && (
        <p className="text-xs text-muted-foreground">Een gerealiseerde mijlpaal is een omzetregistratie: verwijderen kan pas nadat je het afvinken ongedaan maakt.</p>
      )}

      <form onSubmit={toevoegen} noValidate className="grid items-end gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_9rem_8rem_auto]">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`mijlpaal-nieuw-label-${p.id}`}>Nieuwe mijlpaal</Label>
          <Input id={`mijlpaal-nieuw-label-${p.id}`} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="bv. Oplevering prototype" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`mijlpaal-nieuw-maand-${p.id}`}>Maand</Label>
          <Input id={`mijlpaal-nieuw-maand-${p.id}`} type="month" value={maand} onChange={(e) => setMaand(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`mijlpaal-nieuw-bedrag-${p.id}`}>Bedrag</Label>
          <Input id={`mijlpaal-nieuw-bedrag-${p.id}`} inputMode="decimal" className="text-right tabular-nums" value={bedrag} onChange={(e) => setBedrag(e.target.value)} />
        </div>
        <Button type="submit" disabled={conflict}>Toevoegen</Button>
        {p.extensions.length > 0 && (
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor={`mijlpaal-nieuw-uitbreiding-${p.id}`}>Hoort bij</Label>
            <NativeSelect id={`mijlpaal-nieuw-uitbreiding-${p.id}`} value={uitbreiding} onChange={(e) => setUitbreiding(e.target.value)}>
              <option value="">De vaste prijs</option>
              {p.extensions.map((x) => (
                <option key={x.id} value={x.id}>
                  Uitbreiding: {x.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}
        {fout && <p className="text-xs text-destructive sm:col-span-4" role="alert">{fout}</p>}
      </form>
    </section>
  );
}
