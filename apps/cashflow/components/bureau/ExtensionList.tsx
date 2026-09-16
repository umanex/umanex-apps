'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@umanex/ui/components/ui/button';
import { Input } from '@umanex/ui/components/ui/input';
import { Label } from '@umanex/ui/components/ui/label';
import { formatCurrency } from '../../lib/cashflow/recurring';
import { useAnnounce, useMutateBureau, useToday } from '../../hooks/useBureau';
import { useSyncStatus } from '../../lib/cashflow/sync-status';
import type { Project } from '../../lib/bureau/types';
import { removeExtension, upsertExtension } from '../../lib/bureau/mutations';
import { formatHours, parseNumber } from '../../lib/bureau/format';

/** Goedgekeurde uitbreidingen: meerprijs en extra begrote uren bovenop de vaste prijs. */
export function ExtensionList({ project: p }: { project: Project }) {
  const mutate = useMutateBureau();
  const announce = useAnnounce();
  const today = useToday();
  const conflict = useSyncStatus((s) => s.state) === 'conflict';
  const [label, setLabel] = useState('');
  const [op, setOp] = useState(today);
  const [bedrag, setBedrag] = useState('');
  const [uren, setUren] = useState('');
  const [fout, setFout] = useState<string | null>(null);

  const toevoegen = (e: FormEvent) => {
    e.preventDefault();
    const n = parseNumber(bedrag);
    const u = uren.trim() === '' ? null : parseNumber(uren);
    if (!label.trim()) return setFout('Omschrijf de uitbreiding.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(op)) return setFout('Wanneer werd ze goedgekeurd?');
    if (n === null || n < 0) return setFout('De meerprijs is geen getal van 0 of meer.');
    if (uren.trim() !== '' && (u === null || u < 0)) return setFout('De extra uren zijn geen getal van 0 of meer.');
    mutate((d) => upsertExtension(d, p.id, { id: crypto.randomUUID(), label: label.trim(), approvedOn: op, amount: n, extraBudgetedHours: u }));
    announce(`Uitbreiding ${label.trim()} toegevoegd. Plan haar in als mijlpaal om ze in de omzet te zien.`);
    setLabel('');
    setBedrag('');
    setUren('');
    setFout(null);
  };

  return (
    <section aria-labelledby={`uitbreidingen-${p.id}`} className="space-y-3 rounded-xl border border-accent bg-card p-5">
      <h3 id={`uitbreidingen-${p.id}`} className="text-base font-semibold">
        Goedgekeurde uitbreidingen
      </h3>
      {p.extensions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Geen. Een goedgekeurde meerprijs verhoogt de projectprijs; plan haar daarna als mijlpaal.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {p.extensions.map((x) => {
            const gekoppeld = p.milestones.filter((m) => m.extensionId === x.id).length;
            return (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <div>
                  <p className="font-medium">{x.label}</p>
                  <p className="text-xs text-muted-foreground">
                    goedgekeurd {x.approvedOn} · {x.extraBudgetedHours === null ? 'geen extra uren' : `+${formatHours(x.extraBudgetedHours)} begroot`} · {gekoppeld === 0 ? 'nog niet als mijlpaal ingepland' : `${gekoppeld} mijlpaal${gekoppeld === 1 ? '' : 'en'}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">+{formatCurrency(x.amount)}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={conflict}
                    aria-label={`Trek uitbreiding ${x.label} in`}
                    onClick={() => {
                      mutate((d) => removeExtension(d, p.id, x.id));
                      announce(`Uitbreiding ${x.label} ingetrokken${gekoppeld ? `, samen met ${gekoppeld} mijlpaal${gekoppeld === 1 ? '' : 'en'}` : ''}.`);
                    }}
                  >
                    Intrekken
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={toevoegen} noValidate className="grid items-end gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-[1fr_10rem_8rem_7rem_auto]">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`uitbreiding-label-${p.id}`}>Nieuwe uitbreiding</Label>
          <Input id={`uitbreiding-label-${p.id}`} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="bv. Extra flow facturatie" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`uitbreiding-op-${p.id}`}>Goedgekeurd op</Label>
          <Input id={`uitbreiding-op-${p.id}`} type="date" value={op} onChange={(e) => setOp(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`uitbreiding-bedrag-${p.id}`}>Meerprijs</Label>
          <Input id={`uitbreiding-bedrag-${p.id}`} inputMode="decimal" className="text-right tabular-nums" value={bedrag} onChange={(e) => setBedrag(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`uitbreiding-uren-${p.id}`}>Extra uren</Label>
          <Input id={`uitbreiding-uren-${p.id}`} inputMode="decimal" className="text-right tabular-nums" value={uren} onChange={(e) => setUren(e.target.value)} />
        </div>
        <Button type="submit" variant="outline" disabled={conflict}>Toevoegen</Button>
        {fout && <p className="text-xs text-destructive sm:col-span-2 lg:col-span-5" role="alert">{fout}</p>}
      </form>
    </section>
  );
}
