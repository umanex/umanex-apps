'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@umanex/ui/components/ui/button';
import { Separator } from '@umanex/ui/components/ui/separator';
import { SheetClose, SheetFooter } from '@umanex/ui/components/ui/sheet';
import { useAnnounce, useBureau, useMutateBureau, useToday } from '../../hooks/useBureau';
import { useSyncStatus } from '../../lib/cashflow/sync-status';
import { OFFER_TYPES, PROJECT_STATUSES, type Project } from '../../lib/bureau/types';
import { OFFER_LABEL, PROJECT_STATUS_LABEL } from '../../lib/bureau/labels';
import { addProject, updateProject, upsertClient } from '../../lib/bureau/mutations';
import {
  draftFromProject,
  emptyProjectDraft,
  findClientByName,
  projectFromDraft,
  type ProjectDraft,
  type ProjectDraftField,
} from '../../lib/bureau/project-draft';
import { TextField } from './fields/TextField';
import { SelectField } from './fields/SelectField';
import { TextareaField } from './fields/TextareaField';
import { NumberField } from './fields/NumberField';

type ProjectFormProps = {
  project?: Project;
  /** Na opslaan; bij aanmaken met het nieuwe id. */
  onDone: (projectId: string, created: boolean) => void;
};

/**
 * Het formulier binnen de projectsheet. Staat in `SheetContent`, dat bij elk openen opnieuw
 * gemonteerd wordt — zo begint het formulier vanzelf vers, zonder key-truc op de sheet zelf.
 */
export function ProjectForm({ project, onDone }: ProjectFormProps) {
  const bureau = useBureau();
  const today = useToday();
  const mutate = useMutateBureau();
  const announce = useAnnounce();
  const conflict = useSyncStatus((s) => s.state) === 'conflict';
  const [draft, setDraft] = useState<ProjectDraft>(() => (project ? draftFromProject(project, bureau) : emptyProjectDraft(today)));
  const [errors, setErrors] = useState<Partial<Record<ProjectDraftField, string>>>({});

  const zet = <K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const fout = (f: ProjectDraftField) => errors[f];
  const nieuweKlant = draft.clientName.trim() !== '' && !findClientByName(bureau, draft.clientName);

  const opslaan = (e: FormEvent) => {
    e.preventDefault();
    const r = projectFromDraft(draft);
    if (!r.ok) {
      setErrors(r.errors);
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[role="dialog"] [aria-invalid="true"]')?.focus());
      return;
    }
    const bestaandeKlant = findClientByName(bureau, r.clientName);
    const clientId = bestaandeKlant ?? crypto.randomUUID();
    const projectId = project?.id ?? crypto.randomUUID();
    mutate((d) => {
      if (!bestaandeKlant) upsertClient(d, { id: clientId, name: r.clientName, groupId: null });
      if (project) updateProject(d, project.id, { ...r.fields, clientId });
      else addProject(d, { id: projectId, clientId, ...r.fields }, today);
    });
    announce(project ? `Project ${r.fields.name} bijgewerkt.` : `Project ${r.fields.name} aangemaakt.`);
    onDone(projectId, !project);
  };

  return (
    <form onSubmit={opslaan} noValidate className="mt-6 space-y-5">
      <TextField
        id="project-klant"
        label="Klant"
        value={draft.clientName}
        onChange={(v) => zet('clientName', v)}
        suggestions={bureau.clients.map((c) => c.name)}
        error={fout('clientName')}
        hint={nieuweKlant ? `"${draft.clientName.trim()}" is nog geen klant en wordt aangemaakt.` : undefined}
      />
      <TextField id="project-naam" label="Projectnaam" value={draft.name} onChange={(v) => zet('name', v)} error={fout('name')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField id="project-aanbod" label="Aanbod" value={draft.offerType} onChange={(v) => zet('offerType', v as ProjectDraft['offerType'])} options={OFFER_TYPES.map((o) => ({ value: o, label: OFFER_LABEL[o] }))} error={fout('offerType')} />
        <SelectField id="project-status" label="Status" value={draft.status} onChange={(v) => zet('status', v as ProjectDraft['status'])} options={PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABEL[s] }))} error={fout('status')} />
      </div>
      <TextareaField id="project-scope" label="Scope" value={draft.scope} onChange={(v) => zet('scope', v)} hint="Wat valt binnen de opdracht, en wat niet." />

      <Separator />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id="project-contract" type="date" label="Contractdatum" value={draft.contractDate} onChange={(v) => zet('contractDate', v)} error={fout('contractDate')} />
        <NumberField id="project-prijs" label="Vaste prijs (ex btw)" unit="€" value={draft.fixedPriceExVat} onChange={(v) => zet('fixedPriceExVat', v)} error={fout('fixedPriceExVat')} hint="Zonder uitbreidingen." />
        <TextField id="project-start" type="month" label="Uitvoering vanaf" value={draft.plannedStart} onChange={(v) => zet('plannedStart', v)} error={fout('plannedStart')} />
        <TextField id="project-einde" type="month" label="Uitvoering tot" value={draft.plannedEnd} onChange={(v) => zet('plannedEnd', v)} error={fout('plannedEnd')} />
      </div>

      <Separator />
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField id="project-begroot" label="Begrote eigen uren" unit="u" value={draft.budgetedOwnHours} onChange={(v) => zet('budgetedOwnHours', v)} error={fout('budgetedOwnHours')} hint="Leeg = geen begroting." />
        <NumberField
          id="project-resterend"
          label="Verwacht resterende uren"
          unit="u"
          value={draft.expectedRemainingOwnHours}
          onChange={(v) => zet('expectedRemainingOwnHours', v)}
          error={fout('expectedRemainingOwnHours')}
          hint="Nodig voor rendement. Leeg = onvoldoende gegevens."
        />
      </div>

      <Separator />
      <TextField id="project-mijlpaal" label="Volgende mijlpaal" value={draft.nextMilestoneNote} onChange={(v) => zet('nextMilestoneNote', v)} placeholder="bv. Rapport scan, 30 september" />
      <TextareaField id="project-blokkades" label="Blokkades en openstaande klantinput" value={draft.blockers} onChange={(v) => zet('blockers', v)} />

      <SheetFooter className="gap-2 pt-2">
        {conflict && <p id="project-conflict" className="text-sm text-destructive">Eerst herladen — elders gewijzigd.</p>}
        <SheetClose asChild>
          <Button type="button" variant="outline">
            Annuleren
          </Button>
        </SheetClose>
        <Button type="submit" disabled={conflict} aria-describedby={conflict ? 'project-conflict' : undefined}>
          {project ? 'Opslaan' : 'Project aanmaken'}
        </Button>
      </SheetFooter>
    </form>
  );
}
