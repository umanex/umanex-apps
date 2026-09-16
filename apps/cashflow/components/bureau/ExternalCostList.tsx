'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@umanex/ui/components/ui/button';
import { Input } from '@umanex/ui/components/ui/input';
import { Label } from '@umanex/ui/components/ui/label';
import { formatCurrency } from '../../lib/cashflow/recurring';
import { useAnnounce, useMutateBureau } from '../../hooks/useBureau';
import { useSyncStatus } from '../../lib/cashflow/sync-status';
import type { ExternalCost, Project } from '../../lib/bureau/types';
import { removeExternalCost, upsertExternalCost } from '../../lib/bureau/mutations';
import { parseNumber, toInputValue } from '../../lib/bureau/format';

/**
 * Directe externe kosten: freelancers, licenties, onderzoeksbudget. Ze verlagen B, niet A, en
 * tellen nooit als eigen capaciteit. De uitgave zelf hoort in de maandprognose als je ze betaalt.
 */
export function ExternalCostList({ project: p }: { project: Project }) {
  const mutate = useMutateBureau();
  const announce = useAnnounce();
  const conflict = useSyncStatus((s) => s.state) === 'conflict';
  const [label, setLabel] = useState('');
  const [verwacht, setVerwacht] = useState('');
  const [fout, setFout] = useState<string | null>(null);
  const [werkelijk, setWerkelijk] = useState<Record<string, string>>({});

  const toevoegen = (e: FormEvent) => {
    e.preventDefault();
    const n = parseNumber(verwacht);
    if (!label.trim()) return setFout('Omschrijf de kost.');
    if (n === null || n < 0) return setFout('Het verwachte bedrag is geen getal van 0 of meer.');
    mutate((d) => upsertExternalCost(d, p.id, { id: crypto.randomUUID(), label: label.trim(), expected: n, actual: null }));
    announce(`Externe kost ${label.trim()} toegevoegd.`);
    setLabel('');
    setVerwacht('');
    setFout(null);
  };

  const zetWerkelijk = (c: ExternalCost) => {
    // Enter omzeilt de uitgeschakelde OK-knop; tijdens een conflict zou de wijziging lokaal blijven en bij herladen verdwijnen.
    if (conflict) return;
    const tekst = werkelijk[c.id] ?? toInputValue(c.actual);
    const n = tekst.trim() === '' ? null : parseNumber(tekst);
    if (tekst.trim() !== '' && (n === null || n < 0)) return setFout(`Werkelijk bedrag voor ${c.label} is geen getal van 0 of meer.`);
    mutate((d) => upsertExternalCost(d, p.id, { ...c, actual: n }));
    announce(n === null ? `Werkelijk bedrag voor ${c.label} gewist.` : `Werkelijk bedrag voor ${c.label}: ${formatCurrency(n)}.`);
    setFout(null);
  };

  const totaalVerwacht = p.externalCosts.reduce((s, c) => s + c.expected, 0);
  const bekend = p.externalCosts.filter((c) => c.actual !== null);

  return (
    <section aria-labelledby={`kosten-${p.id}`} className="space-y-3 rounded-xl border border-accent bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`kosten-${p.id}`} className="text-base font-semibold">
          Directe externe kosten
        </h3>
        {p.externalCosts.length > 0 && (
          <p className="text-sm text-muted-foreground">
            verwacht <span className="font-medium text-foreground tabular-nums">{formatCurrency(totaalVerwacht)}</span> · werkelijk bekend voor {bekend.length} van {p.externalCosts.length}
          </p>
        )}
      </div>
      {p.externalCosts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Geen. Zonder externe kosten zijn A en B gelijk.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {p.externalCosts.map((c) => (
            <li key={c.id} className="flex flex-wrap items-end justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="font-medium">{c.label}</p>
                <p className="text-xs text-muted-foreground">verwacht {formatCurrency(c.expected)}</p>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`kost-werkelijk-${c.id}`} className="text-xs">Werkelijk</Label>
                  <Input
                    id={`kost-werkelijk-${c.id}`}
                    inputMode="decimal"
                    className="h-9 w-28 text-right tabular-nums"
                    value={werkelijk[c.id] ?? toInputValue(c.actual)}
                    placeholder="onbekend"
                    onChange={(e) => setWerkelijk((w) => ({ ...w, [c.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); zetWerkelijk(c); } }}
                  />
                </div>
                <Button size="sm" variant="outline" disabled={conflict} onClick={() => zetWerkelijk(c)} aria-label={`Bewaar werkelijk bedrag voor ${c.label}`}>
                  OK
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={conflict}
                  aria-label={`Verwijder kost ${c.label}`}
                  onClick={() => {
                    mutate((d) => removeExternalCost(d, p.id, c.id));
                    announce(`Externe kost ${c.label} verwijderd.`);
                  }}
                >
                  Verwijderen
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={toevoegen} noValidate className="grid items-end gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_9rem_auto]">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`kost-label-${p.id}`}>Nieuwe externe kost</Label>
          <Input id={`kost-label-${p.id}`} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="bv. Freelancer research, 3 dagen" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`kost-verwacht-${p.id}`}>Verwacht</Label>
          <Input id={`kost-verwacht-${p.id}`} inputMode="decimal" className="text-right tabular-nums" value={verwacht} onChange={(e) => setVerwacht(e.target.value)} />
        </div>
        <Button type="submit" variant="outline" disabled={conflict}>Toevoegen</Button>
        {fout && <p className="text-xs text-destructive sm:col-span-3" role="alert">{fout}</p>}
      </form>
    </section>
  );
}
