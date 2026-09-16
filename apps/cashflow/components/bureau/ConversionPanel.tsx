'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@umanex/ui/components/ui/button';
import { useAnnounce, useBureau, useMutateBureau, useToday } from '../../hooks/useBureau';
import { useSyncStatus } from '../../lib/cashflow/sync-status';
import { OFFER_TYPES, type Opportunity } from '../../lib/bureau/types';
import { OFFER_LABEL } from '../../lib/bureau/labels';
import { convertOpportunity } from '../../lib/bureau/mutations';
import { conversionDraft, conversionFromDraft, type ConversionDraft } from '../../lib/bureau/opportunity-draft';
import { findClientByName } from '../../lib/bureau/project-draft';
import { TextField } from './fields/TextField';
import { SelectField } from './fields/SelectField';
import { TextareaField } from './fields/TextareaField';
import { NumberField } from './fields/NumberField';

const WEIGERING = {
  'geen-kans': 'Deze kans bestaat niet meer.',
  'niet-gewonnen': 'Alleen een gewonnen kans wordt een project.',
  'al-omgezet': 'Deze kans is al een project.',
  'klant-ontbreekt': 'Vul de klant in.',
} as const;

/**
 * Een gewonnen kans wordt precies één project. Verschijnt alleen zolang er geen project aan hangt;
 * daarna toont de kans een link naar het project en komt deze knop niet terug.
 */
export function ConversionPanel({ opportunity: o }: { opportunity: Opportunity }) {
  const bureau = useBureau();
  const today = useToday();
  const mutate = useMutateBureau();
  const announce = useAnnounce();
  const conflict = useSyncStatus((s) => s.state) === 'conflict';
  const [draft, setDraft] = useState<ConversionDraft>(() => conversionDraft(o, bureau, today));
  const [errors, setErrors] = useState<Partial<Record<keyof ConversionDraft, string>>>({});
  const [weigering, setWeigering] = useState<string | null>(null);

  const zet = <K extends keyof ConversionDraft>(key: K, value: ConversionDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const nieuweKlant = draft.clientName.trim() !== '' && !findClientByName(bureau, draft.clientName);

  const omzetten = (e: FormEvent) => {
    e.preventDefault();
    const r = conversionFromDraft(draft, bureau);
    if (!r.ok) {
      setErrors(r.errors);
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[role="dialog"] form[data-form="omzetting"] [aria-invalid="true"]')?.focus());
      return;
    }
    const uitkomst = mutate((d) => convertOpportunity(d, o.id, r.input, { projectId: crypto.randomUUID(), clientId: crypto.randomUUID() }, today));
    if (uitkomst !== 'ok') {
      setWeigering(WEIGERING[uitkomst]);
      return;
    }
    announce(`Project ${r.input.name} aangemaakt uit de kans ${o.company}.`);
  };

  return (
    <form onSubmit={omzetten} noValidate data-form="omzetting" className="space-y-4 rounded-lg border border-accent bg-card p-4">
      <p className="text-sm">Gewonnen. Maak er het project van — één keer; de koppeling blijft bewaard.</p>
      <TextField
        id="omzetting-klant"
        label="Klant"
        value={draft.clientName}
        onChange={(v) => zet('clientName', v)}
        suggestions={bureau.clients.map((c) => c.name)}
        error={errors.clientName}
        hint={nieuweKlant ? `"${draft.clientName.trim()}" is nog geen klant en wordt aangemaakt.` : undefined}
      />
      <TextField id="omzetting-naam" label="Projectnaam" value={draft.name} onChange={(v) => zet('name', v)} error={errors.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField id="omzetting-aanbod" label="Aanbod" value={draft.offerType} onChange={(v) => zet('offerType', v as ConversionDraft['offerType'])} options={OFFER_TYPES.map((x) => ({ value: x, label: OFFER_LABEL[x] }))} error={errors.offerType} />
        <NumberField id="omzetting-prijs" label="Getekende prijs (ex btw)" unit="€" value={draft.fixedPriceExVat} onChange={(v) => zet('fixedPriceExVat', v)} error={errors.fixedPriceExVat} />
        <TextField id="omzetting-start" type="month" label="Uitvoering vanaf" value={draft.plannedStart} onChange={(v) => zet('plannedStart', v)} error={errors.plannedStart} />
        <TextField id="omzetting-einde" type="month" label="Uitvoering tot" value={draft.plannedEnd} onChange={(v) => zet('plannedEnd', v)} error={errors.plannedEnd} />
      </div>
      <TextareaField id="omzetting-scope" label="Scope" value={draft.scope} onChange={(v) => zet('scope', v)} />
      {weigering && (
        <p className="text-sm text-destructive" role="alert">
          {weigering}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {conflict && <p id="omzetting-conflict" className="text-sm text-destructive">Eerst herladen — elders gewijzigd.</p>}
        <Button type="submit" disabled={conflict} aria-describedby={conflict ? 'omzetting-conflict' : undefined}>
          Project aanmaken
        </Button>
      </div>
    </form>
  );
}
