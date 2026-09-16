/**
 * Het projectformulier als tekst, en de weg terug naar projectvelden.
 *
 * Zelfde regime als `goals-draft.ts`: tekst tot opslaan, een onleesbaar veld blokkeert met een
 * melding, niets wordt stil 0. De klant is een naam: bestaat ze al (hoofdletterongevoelig, zonder
 * randspaties), dan hoort het project bij die klant; anders ontstaat er een nieuwe.
 */
import type { BureauData, OfferType, Project, ProjectStatus } from './types.ts';
import { OFFER_TYPES, PROJECT_STATUSES } from './types.ts';
import { parseNumber, toInputValue } from './format.ts';

export type ProjectDraft = {
  clientName: string;
  name: string;
  offerType: OfferType;
  status: ProjectStatus;
  scope: string;
  contractDate: string;
  plannedStart: string;
  plannedEnd: string;
  fixedPriceExVat: string;
  budgetedOwnHours: string;
  expectedRemainingOwnHours: string;
  nextMilestoneNote: string;
  blockers: string;
};

export type ProjectDraftField = keyof ProjectDraft;

export function emptyProjectDraft(today: string): ProjectDraft {
  return {
    clientName: '', name: '', offerType: 'workflowtraject', status: 'gepland', scope: '',
    contractDate: today, plannedStart: today.slice(0, 7), plannedEnd: today.slice(0, 7),
    fixedPriceExVat: '', budgetedOwnHours: '', expectedRemainingOwnHours: '', nextMilestoneNote: '', blockers: '',
  };
}

export function draftFromProject(p: Project, bureau: BureauData): ProjectDraft {
  return {
    clientName: bureau.clients.find((c) => c.id === p.clientId)?.name ?? '',
    name: p.name, offerType: p.offerType, status: p.status, scope: p.scope,
    contractDate: p.contractDate, plannedStart: p.plannedStart, plannedEnd: p.plannedEnd,
    fixedPriceExVat: toInputValue(p.fixedPriceExVat),
    budgetedOwnHours: toInputValue(p.budgetedOwnHours),
    expectedRemainingOwnHours: toInputValue(p.expectedRemainingOwnHours),
    nextMilestoneNote: p.nextMilestoneNote, blockers: p.blockers,
  };
}

/** De bestaande klant bij deze naam, of `null` — dan hoort er een aan te maken. */
export function findClientByName(bureau: BureauData, name: string): string | null {
  const n = name.trim().toLocaleLowerCase('nl-BE');
  return bureau.clients.find((c) => c.name.trim().toLocaleLowerCase('nl-BE') === n)?.id ?? null;
}

export type ProjectDraftFields = Omit<Project, 'id' | 'clientId' | 'extensions' | 'externalCosts' | 'milestones' | 'invoices' | 'opportunityId' | 'createdAt'>;

export type ProjectDraftResult =
  | { ok: true; clientName: string; fields: ProjectDraftFields }
  | { ok: false; errors: Partial<Record<ProjectDraftField, string>> };

export function projectFromDraft(d: ProjectDraft): ProjectDraftResult {
  const errors: Partial<Record<ProjectDraftField, string>> = {};
  if (!d.clientName.trim()) errors.clientName = 'Vul de klant in.';
  if (!d.name.trim()) errors.name = 'Geef het project een naam.';
  if (!OFFER_TYPES.includes(d.offerType)) errors.offerType = 'Kies een aanbodtype.';
  if (!PROJECT_STATUSES.includes(d.status)) errors.status = 'Kies een status.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.contractDate)) errors.contractDate = 'Een datum, bv. 2027-01-15.';
  if (!/^\d{4}-\d{2}$/.test(d.plannedStart)) errors.plannedStart = 'Een maand, bv. 2027-02.';
  if (!/^\d{4}-\d{2}$/.test(d.plannedEnd)) errors.plannedEnd = 'Een maand, bv. 2027-06.';
  else if (!errors.plannedStart && d.plannedEnd < d.plannedStart) errors.plannedEnd = 'Het einde ligt vóór de start.';

  const prijs = parseNumber(d.fixedPriceExVat);
  if (prijs === null) errors.fixedPriceExVat = d.fixedPriceExVat.trim() ? 'Geen bedrag — bv. 18.000.' : 'Vul de vaste prijs in.';
  else if (prijs < 0) errors.fixedPriceExVat = 'Mag niet negatief zijn.';

  const optioneleUren = (field: 'budgetedOwnHours' | 'expectedRemainingOwnHours'): number | null => {
    const v = d[field];
    if (!v.trim()) return null;
    const n = parseNumber(v);
    if (n === null) errors[field] = 'Geen getal — bv. 64 of 7,5.';
    else if (n < 0) errors[field] = 'Mag niet negatief zijn.';
    return n;
  };
  const budgeted = optioneleUren('budgetedOwnHours');
  const remaining = optioneleUren('expectedRemainingOwnHours');

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    clientName: d.clientName.trim(),
    fields: {
      name: d.name.trim(), offerType: d.offerType, status: d.status, scope: d.scope.trim(),
      contractDate: d.contractDate, plannedStart: d.plannedStart, plannedEnd: d.plannedEnd,
      fixedPriceExVat: prijs!, budgetedOwnHours: budgeted, expectedRemainingOwnHours: remaining,
      nextMilestoneNote: d.nextMilestoneNote.trim(), blockers: d.blockers.trim(),
    },
  };
}
