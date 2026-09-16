'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@umanex/ui/components/ui/button';
import { useAnnounce, useMutateBureau, useToday } from '../../hooks/useBureau';
import { useSyncStatus } from '../../lib/cashflow/sync-status';
import { STAGES, type Opportunity, type OpportunityStage } from '../../lib/bureau/types';
import { STAGE_LABEL } from '../../lib/bureau/labels';
import { moveOpportunityStage } from '../../lib/bureau/mutations';
import { REASON_REQUIRED, suggestedNextStage, validateStageChange, type StageChangeDraft } from '../../lib/bureau/opportunity-draft';
import { SelectField } from './fields/SelectField';
import { TextField } from './fields/TextField';
import { TextareaField } from './fields/TextareaField';

type StageChangeFormProps = { opportunity: Opportunity };

/** Een nieuwe stap in de historie: stadium, datum en — bij verloren of geparkeerd — de reden. */
export function StageChangeForm({ opportunity: o }: StageChangeFormProps) {
  const today = useToday();
  const mutate = useMutateBureau();
  const announce = useAnnounce();
  const conflict = useSyncStatus((s) => s.state) === 'conflict';
  const opties = STAGES.filter((s) => s !== o.stage);
  const [draft, setDraft] = useState<StageChangeDraft>({ stage: suggestedNextStage(o.stage), on: today, reason: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof StageChangeDraft, string>>>({});
  const redenVerplicht = REASON_REQUIRED.includes(draft.stage);

  const wijzig = (e: FormEvent) => {
    e.preventDefault();
    const r = validateStageChange(draft, o);
    if (!r.ok) {
      setErrors(r.errors);
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[role="dialog"] form[data-form="stadium"] [aria-invalid="true"]')?.focus());
      return;
    }
    mutate((d) => moveOpportunityStage(d, o.id, draft.stage, draft.on, r.reason));
    // De ouder geeft dit formulier `key={stage}`: na de wissel begint het vers.
    announce(`${o.company} staat nu op ${STAGE_LABEL[draft.stage]}.`);
  };

  return (
    <form onSubmit={wijzig} noValidate data-form="stadium" className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="stadium-nieuw"
          label="Naar"
          value={draft.stage}
          onChange={(v) => setDraft((d) => ({ ...d, stage: v as OpportunityStage }))}
          options={opties.map((s) => ({ value: s, label: STAGE_LABEL[s] }))}
          error={errors.stage}
        />
        <TextField id="stadium-datum" type="date" label="Op" value={draft.on} onChange={(v) => setDraft((d) => ({ ...d, on: v }))} error={errors.on} />
      </div>
      <TextareaField
        id="stadium-reden"
        label={redenVerplicht ? 'Reden' : 'Reden (optioneel)'}
        value={draft.reason}
        onChange={(v) => setDraft((d) => ({ ...d, reason: v }))}
        error={errors.reason}
        hint={redenVerplicht ? 'Waarom verloren of uitgesteld — dat lees je later terug.' : undefined}
      />
      <div className="flex flex-wrap items-center justify-end gap-3">
        {conflict && <p id="stadium-conflict" className="text-sm text-destructive">Eerst herladen — elders gewijzigd.</p>}
        <Button type="submit" variant="secondary" disabled={conflict} aria-describedby={conflict ? 'stadium-conflict' : undefined}>
          Stadium wijzigen
        </Button>
      </div>
    </form>
  );
}
