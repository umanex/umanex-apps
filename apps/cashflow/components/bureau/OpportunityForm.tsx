'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@umanex/ui/components/ui/button';
import { Checkbox } from '@umanex/ui/components/ui/checkbox';
import { Label } from '@umanex/ui/components/ui/label';
import { Separator } from '@umanex/ui/components/ui/separator';
import { SheetClose, SheetFooter } from '@umanex/ui/components/ui/sheet';
import { useAnnounce, useBureau, useMutateBureau, useToday } from '../../hooks/useBureau';
import { useSyncStatus } from '../../lib/cashflow/sync-status';
import { BUDGET_STATUSES, OFFER_TYPES, OPEN_STAGES, type Opportunity } from '../../lib/bureau/types';
import { BUDGET_STATUS_LABEL, OFFER_LABEL, STAGE_LABEL } from '../../lib/bureau/labels';
import { addOpportunity, updateOpportunity } from '../../lib/bureau/mutations';
import {
  draftFromOpportunity,
  emptyOpportunityDraft,
  opportunityFromDraft,
  type OpportunityDraft,
  type OpportunityDraftField,
} from '../../lib/bureau/opportunity-draft';
import { TextField } from './fields/TextField';
import { SelectField } from './fields/SelectField';
import { TextareaField } from './fields/TextareaField';
import { NumberField } from './fields/NumberField';

type OpportunityFormProps = {
  /** Bewerken; zonder kans maakt het formulier een nieuwe aan. */
  opportunity?: Opportunity;
  onDone: () => void;
};

/**
 * De gegevens van een kans. Het stadium kies je alleen bij aanmaken; daarna verandert het via een
 * overgang met datum, zodat de historie waar de conversiecijfers op rekenen klopt.
 */
export function OpportunityForm({ opportunity, onDone }: OpportunityFormProps) {
  const bureau = useBureau();
  const today = useToday();
  const mutate = useMutateBureau();
  const announce = useAnnounce();
  const conflict = useSyncStatus((s) => s.state) === 'conflict';
  const [draft, setDraft] = useState<OpportunityDraft>(() => (opportunity ? draftFromOpportunity(opportunity) : emptyOpportunityDraft()));
  const [errors, setErrors] = useState<Partial<Record<OpportunityDraftField, string>>>({});
  const prefix = opportunity ? 'kans-bewerk' : 'kans';

  const zet = <K extends keyof OpportunityDraft>(key: K, value: OpportunityDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const opslaan = (e: FormEvent) => {
    e.preventDefault();
    const r = opportunityFromDraft(draft, bureau);
    if (!r.ok) {
      setErrors(r.errors);
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`[role="dialog"] form[data-form="${prefix}"] [aria-invalid="true"]`)?.focus());
      return;
    }
    setErrors({});
    if (opportunity) {
      mutate((d) => updateOpportunity(d, opportunity.id, r.fields));
      announce(`Gegevens van ${r.fields.company} opgeslagen.`);
    } else {
      mutate((d) => addOpportunity(d, { id: crypto.randomUUID(), ...r.fields }, r.stage, today));
      announce(`Kans ${r.fields.company} toegevoegd in ${STAGE_LABEL[r.stage]}.`);
    }
    onDone();
  };

  return (
    <form onSubmit={opslaan} noValidate data-form={prefix} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id={`${prefix}-bedrijf`} label="Bedrijf" value={draft.company} onChange={(v) => zet('company', v)} error={errors.company} suggestions={bureau.clients.map((c) => c.name)} />
        <TextField id={`${prefix}-contact`} label="Contactpersoon" value={draft.contact} onChange={(v) => zet('contact', v)} />
      </div>
      {!opportunity && (
        <SelectField
          id="kans-stadium"
          label="Stadium"
          value={draft.stage}
          onChange={(v) => zet('stage', v as OpportunityDraft['stage'])}
          options={OPEN_STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s] }))}
          error={errors.stage}
          hint="Gewonnen, verloren of geparkeerd zet je daarna, met datum en reden."
        />
      )}

      <Separator />
      <TextareaField id={`${prefix}-aanleiding`} label="Concrete aanleiding" value={draft.triggerDescription} onChange={(v) => zet('triggerDescription', v)} hint="Wat maakte dit nu relevant — een nieuw product, een vacature, een gesprek." />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id={`${prefix}-bron`} label="Bron" value={draft.triggerSource} onChange={(v) => zet('triggerSource', v)} placeholder="bv. LinkedIn, doorverwijzing" />
        <TextField id={`${prefix}-aanleiding-datum`} type="date" label="Datum aanleiding" value={draft.triggerDate} onChange={(v) => zet('triggerDate', v)} error={errors.triggerDate} />
      </div>

      <Separator />
      <TextareaField id={`${prefix}-behoefte`} label="Behoefte" value={draft.need} onChange={(v) => zet('need', v)} hint="Concreet: welk probleem, bij wie. Leeg telt als ontbrekend in de kwalificatie." />
      <SelectField
        id={`${prefix}-aanbod`}
        label="Passend aanbod"
        value={draft.offerType}
        onChange={(v) => zet('offerType', v as OpportunityDraft['offerType'])}
        options={[{ value: '', label: 'Nog niet bepaald' }, ...OFFER_TYPES.map((o) => ({ value: o, label: OFFER_LABEL[o] }))]}
        error={errors.offerType}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id={`${prefix}-budgetstatus`}
          label="Budget"
          value={draft.budgetStatus}
          onChange={(v) => zet('budgetStatus', v as OpportunityDraft['budgetStatus'])}
          options={BUDGET_STATUSES.map((s) => ({ value: s, label: BUDGET_STATUS_LABEL[s] }))}
          error={errors.budgetStatus}
        />
        <NumberField id={`${prefix}-budget`} label="Budgetindicatie" unit="€" value={draft.budgetAmount} onChange={(v) => zet('budgetAmount', v)} error={errors.budgetAmount} />
      </div>
      <NumberField
        id={`${prefix}-waarde`}
        label="Verwachte opdrachtwaarde (ex btw)"
        unit="€"
        value={draft.expectedValue}
        onChange={(v) => zet('expectedValue', v)}
        error={errors.expectedValue}
        hint="Telt nergens mee als omzet of getekend werk, en wordt niet gewogen."
      />
      <div className="flex items-start gap-3">
        <Checkbox id={`${prefix}-beslisser`} checked={draft.decisionMakerInvolved} onCheckedChange={(v) => zet('decisionMakerInvolved', v === true)} />
        <Label htmlFor={`${prefix}-beslisser`} className="leading-5">
          De beslisser is betrokken
        </Label>
      </div>

      <Separator />
      <TextField id={`${prefix}-beslisdatum`} type="date" label="Verwachte beslisdatum" value={draft.expectedDecisionDate} onChange={(v) => zet('expectedDecisionDate', v)} error={errors.expectedDecisionDate} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id={`${prefix}-uitvoering-start`} type="month" label="Uitvoering vanaf" value={draft.executionStart} onChange={(v) => zet('executionStart', v)} error={errors.executionStart} />
        <TextField id={`${prefix}-uitvoering-einde`} type="month" label="Uitvoering tot" value={draft.executionEnd} onChange={(v) => zet('executionEnd', v)} error={errors.executionEnd} />
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
        <TextField id={`${prefix}-actie`} label="Volgende actie" value={draft.nextActionText} onChange={(v) => zet('nextActionText', v)} error={errors.nextActionText} placeholder="bv. Voorstel sturen" />
        <TextField id={`${prefix}-actie-datum`} type="date" label="Op" value={draft.nextActionDate} onChange={(v) => zet('nextActionDate', v)} error={errors.nextActionDate} />
      </div>

      {opportunity ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {conflict && <p id={`${prefix}-conflict`} className="text-sm text-destructive">Eerst herladen — elders gewijzigd.</p>}
          <Button type="submit" disabled={conflict} aria-describedby={conflict ? `${prefix}-conflict` : undefined}>
            Gegevens opslaan
          </Button>
        </div>
      ) : (
        <SheetFooter className="gap-2 pt-2">
          {conflict && <p id={`${prefix}-conflict`} className="text-sm text-destructive">Eerst herladen — elders gewijzigd.</p>}
          <SheetClose asChild>
            <Button type="button" variant="outline">
              Annuleren
            </Button>
          </SheetClose>
          <Button type="submit" disabled={conflict} aria-describedby={conflict ? `${prefix}-conflict` : undefined}>
            Kans toevoegen
          </Button>
        </SheetFooter>
      )}
    </form>
  );
}
