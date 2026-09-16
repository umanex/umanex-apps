'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@umanex/ui/components/ui/button';
import { Input } from '@umanex/ui/components/ui/input';
import { Label } from '@umanex/ui/components/ui/label';
import { NativeSelect } from '@umanex/ui/components/ui/native-select';
import { useAnnounce, useMutateBureau } from '../../hooks/useBureau';
import { useSyncStatus } from '../../lib/cashflow/sync-status';
import type { BureauData } from '../../lib/bureau/types';
import { removeClientGroup, upsertClient, upsertClientGroup } from '../../lib/bureau/mutations';

/**
 * Klantgroepen: verbonden klanten (een holding, twee entiteiten van één koper) die voor de
 * concentratie als één tellen. Een groep kiezen schrijft meteen — het is één keuze, geen typwerk.
 */
export function ClientGroupsPanel({ bureau }: { bureau: BureauData }) {
  const mutate = useMutateBureau();
  const announce = useAnnounce();
  const conflict = useSyncStatus((s) => s.state) === 'conflict';
  const [naam, setNaam] = useState('');
  const [fout, setFout] = useState<string | null>(null);

  const groepToevoegen = (e: FormEvent) => {
    e.preventDefault();
    const n = naam.trim();
    if (!n) return setFout('Geef de groep een naam.');
    if (bureau.clientGroups.some((g) => g.name.trim().toLocaleLowerCase('nl-BE') === n.toLocaleLowerCase('nl-BE'))) return setFout('Die groep bestaat al.');
    mutate((d) => upsertClientGroup(d, { id: crypto.randomUUID(), name: n }));
    announce(`Groep ${n} toegevoegd.`);
    setNaam('');
    setFout(null);
  };

  const klanten = [...bureau.clients].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section aria-labelledby="groepen-titel" className="space-y-4 rounded-xl border border-accent bg-card p-5">
      <div>
        <h3 id="groepen-titel" className="text-base font-semibold">
          Klanten en groepen
        </h3>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">Klanten ontstaan bij een project of een omgezette kans. Zet verbonden klanten in één groep om ze samen te tellen.</p>
      </div>
      <ul className="divide-y divide-border">
        {klanten.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2 text-dense" data-client-row={c.id}>
            <Label htmlFor={`klant-groep-${c.id}`} className="font-normal">
              {c.name}
            </Label>
            <NativeSelect
              id={`klant-groep-${c.id}`}
              wrapperClassName="w-56"
              value={c.groupId ?? ''}
              disabled={conflict || bureau.clientGroups.length === 0}
              onChange={(e) => {
                const groupId = e.target.value || null;
                mutate((d) => upsertClient(d, { ...c, groupId }));
                announce(groupId ? `${c.name} hoort nu bij ${bureau.clientGroups.find((g) => g.id === groupId)?.name}.` : `${c.name} hoort bij geen groep meer.`);
              }}
            >
              <option value="">Geen groep</option>
              {bureau.clientGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </NativeSelect>
          </li>
        ))}
      </ul>

      {bureau.clientGroups.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Groepen">
          {bureau.clientGroups.map((g) => {
            const leden = bureau.clients.filter((c) => c.groupId === g.id).length;
            return (
              <li key={g.id} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-sm">
                <span>
                  {g.name} <span className="text-muted-foreground">({leden})</span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={conflict}
                  aria-label={`Verwijder groep ${g.name}; de klanten blijven`}
                  onClick={() => {
                    mutate((d) => removeClientGroup(d, g.id));
                    announce(`Groep ${g.name} verwijderd; de klanten blijven.`);
                  }}
                >
                  Verwijderen
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={groepToevoegen} noValidate className="grid items-end gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-2">
          <Label htmlFor="groep-naam">Nieuwe groep</Label>
          <Input id="groep-naam" value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="bv. Holding van twee klanten" aria-invalid={fout ? true : undefined} aria-describedby={fout ? 'groep-fout' : undefined} />
        </div>
        <Button type="submit" disabled={conflict}>Groep toevoegen</Button>
        {fout && <p id="groep-fout" className="text-xs text-destructive sm:col-span-2" role="alert">{fout}</p>}
      </form>
    </section>
  );
}
