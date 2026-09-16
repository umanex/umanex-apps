/**
 * Het kansformulier, een stadiumwissel en de omzetting naar een project — als tekst, met de weg
 * terug naar velden.
 *
 * Zelfde regime als `project-draft.ts`: tekst tot opslaan, een onleesbaar veld blokkeert met een
 * melding, een leeg veld is onbekend en nooit 0. Een half ingevulde volgende actie of
 * uitvoeringsperiode wordt geweigerd in plaats van half bewaard.
 */
import type { BudgetStatus, BureauData, IsoDate, OfferType, Opportunity, OpportunityStage } from './types.ts';
import { BUDGET_STATUSES, OFFER_TYPES, OPEN_STAGES } from './types.ts';
import type { ConvertInput, OpportunityFields } from './mutations.ts';
import { parseNumber, toInputValue } from './format.ts';
import { findClientByName } from './project-draft.ts';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;

export type OpportunityDraft = {
  company: string;
  contact: string;
  triggerDescription: string;
  triggerSource: string;
  triggerDate: string;
  need: string;
  offerType: OfferType | '';
  budgetStatus: BudgetStatus;
  budgetAmount: string;
  expectedValue: string;
  decisionMakerInvolved: boolean;
  expectedDecisionDate: string;
  executionStart: string;
  executionEnd: string;
  nextActionText: string;
  nextActionDate: string;
  /** Alleen bij aanmaken; daarna verandert het stadium via een overgang met datum. */
  stage: OpportunityStage;
};

export type OpportunityDraftField = keyof OpportunityDraft;

export function emptyOpportunityDraft(): OpportunityDraft {
  return {
    company: '', contact: '', triggerDescription: '', triggerSource: '', triggerDate: '', need: '', offerType: '',
    budgetStatus: 'onbekend', budgetAmount: '', expectedValue: '', decisionMakerInvolved: false, expectedDecisionDate: '',
    executionStart: '', executionEnd: '', nextActionText: '', nextActionDate: '', stage: 'contact',
  };
}

export function draftFromOpportunity(o: Opportunity): OpportunityDraft {
  return {
    company: o.company, contact: o.contact,
    triggerDescription: o.trigger.description, triggerSource: o.trigger.source, triggerDate: o.trigger.date ?? '',
    need: o.need, offerType: o.offerType ?? '',
    budgetStatus: o.budget.status, budgetAmount: toInputValue(o.budget.amount), expectedValue: toInputValue(o.expectedValue),
    decisionMakerInvolved: o.decisionMakerInvolved, expectedDecisionDate: o.expectedDecisionDate ?? '',
    executionStart: o.expectedExecution?.start ?? '', executionEnd: o.expectedExecution?.end ?? '',
    nextActionText: o.nextAction?.text ?? '', nextActionDate: o.nextAction?.date ?? '',
    stage: o.stage,
  };
}

export type OpportunityDraftResult =
  | { ok: true; fields: Omit<OpportunityFields, 'id'>; stage: OpportunityStage }
  | { ok: false; errors: Partial<Record<OpportunityDraftField, string>> };

/**
 * `clientId` koppelt aan een bestaande klant met dezelfde naam als het bedrijf; een nieuwe klant
 * ontstaat pas bij de omzetting naar een project.
 */
export function opportunityFromDraft(d: OpportunityDraft, bureau: BureauData): OpportunityDraftResult {
  const errors: Partial<Record<OpportunityDraftField, string>> = {};
  if (!d.company.trim()) errors.company = 'Vul het bedrijf in.';
  if (d.offerType !== '' && !OFFER_TYPES.includes(d.offerType)) errors.offerType = 'Kies een aanbod of laat leeg.';
  if (!BUDGET_STATUSES.includes(d.budgetStatus)) errors.budgetStatus = 'Kies een budgetstatus.';
  if (!OPEN_STAGES.includes(d.stage)) errors.stage = 'Een nieuwe kans start open — gewonnen, verloren of geparkeerd zet je daarna, met datum.';

  const datum = (field: 'triggerDate' | 'expectedDecisionDate' | 'nextActionDate'): IsoDate | null => {
    const v = d[field].trim();
    if (!v) return null;
    if (!ISO_DATE.test(v)) errors[field] = 'Een datum, bv. 2027-03-15.';
    return v;
  };
  const bedrag = (field: 'budgetAmount' | 'expectedValue'): number | null => {
    const v = d[field];
    if (!v.trim()) return null;
    const n = parseNumber(v);
    if (n === null) errors[field] = 'Geen bedrag — bv. 25.000.';
    else if (n < 0) errors[field] = 'Mag niet negatief zijn.';
    return n;
  };

  const triggerDate = datum('triggerDate');
  const decisionDate = datum('expectedDecisionDate');
  const actionDate = datum('nextActionDate');
  const budgetAmount = bedrag('budgetAmount');
  const expectedValue = bedrag('expectedValue');

  const start = d.executionStart.trim();
  const end = d.executionEnd.trim();
  if (start && !MONTH.test(start)) errors.executionStart = 'Een maand, bv. 2027-05.';
  if (end && !MONTH.test(end)) errors.executionEnd = 'Een maand, bv. 2027-07.';
  if (start && !end && !errors.executionStart) errors.executionEnd = 'Vul ook het einde in, of maak beide leeg.';
  if (end && !start && !errors.executionEnd) errors.executionStart = 'Vul ook de start in, of maak beide leeg.';
  if (start && end && !errors.executionStart && !errors.executionEnd && end < start) errors.executionEnd = 'Het einde ligt vóór de start.';

  const actie = d.nextActionText.trim();
  if (actie && !d.nextActionDate.trim()) errors.nextActionDate = 'Geef de actie een datum.';
  if (!actie && d.nextActionDate.trim()) errors.nextActionText = 'Wat is de actie?';

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    stage: d.stage,
    fields: {
      company: d.company.trim(),
      contact: d.contact.trim(),
      clientId: findClientByName(bureau, d.company),
      trigger: { description: d.triggerDescription.trim(), source: d.triggerSource.trim(), date: triggerDate },
      need: d.need.trim(),
      offerType: d.offerType === '' ? null : d.offerType,
      budget: { status: d.budgetStatus, amount: budgetAmount },
      expectedValue,
      decisionMakerInvolved: d.decisionMakerInvolved,
      expectedDecisionDate: decisionDate,
      expectedExecution: start && end ? { start, end } : null,
      nextAction: actie ? { text: actie, date: actionDate! } : null,
    },
  };
}

export type StageChangeDraft = { stage: OpportunityStage; on: string; reason: string };

/** Het voor de hand liggende volgende stadium: een stap verder in de trechter, of terug naar gesprek na een afsluiting. */
export function suggestedNextStage(stage: OpportunityStage): OpportunityStage {
  const volgorde: Record<OpportunityStage, OpportunityStage> = {
    contact: 'gesprek', gesprek: 'gekwalificeerd', gekwalificeerd: 'voorstel', voorstel: 'gewonnen',
    gewonnen: 'verloren', verloren: 'gesprek', geparkeerd: 'gesprek',
  };
  return volgorde[stage];
}

export const REASON_REQUIRED: readonly OpportunityStage[] = ['verloren', 'geparkeerd'];

/**
 * Een overgang is een nieuw stadium op een datum. Niet vóór de vorige overgang — anders telt een
 * kans in een periode die ze nooit doorliep — en bij verloren of geparkeerd met een reden.
 */
export function validateStageChange(d: StageChangeDraft, o: Opportunity): { ok: true; reason: string | null } | { ok: false; errors: Partial<Record<keyof StageChangeDraft, string>> } {
  const errors: Partial<Record<keyof StageChangeDraft, string>> = {};
  if (d.stage === o.stage) errors.stage = 'De kans staat al in dit stadium.';
  const laatste = o.history.reduce<string>((m, h) => (h.on > m ? h.on : m), '');
  if (!ISO_DATE.test(d.on)) errors.on = 'Een datum, bv. 2027-03-15.';
  else if (laatste && d.on < laatste) errors.on = `Ligt vóór de vorige overgang (${laatste}).`;
  const reden = d.reason.trim();
  if (REASON_REQUIRED.includes(d.stage) && !reden) errors.reason = 'Noteer waarom — dat is wat je later wil teruglezen.';
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, reason: reden || null };
}

export type ConversionDraft = {
  clientName: string;
  name: string;
  offerType: OfferType;
  fixedPriceExVat: string;
  plannedStart: string;
  plannedEnd: string;
  scope: string;
};

/** Vooringevuld uit de kans: de gekoppelde klant of het bedrijf, de verwachte waarde als prijs, de verwachte uitvoering. */
export function conversionDraft(o: Opportunity, bureau: BureauData, today: IsoDate): ConversionDraft {
  const maand = today.slice(0, 7);
  return {
    clientName: bureau.clients.find((c) => c.id === o.clientId)?.name ?? o.company,
    name: '',
    offerType: o.offerType ?? 'overig',
    fixedPriceExVat: toInputValue(o.expectedValue),
    plannedStart: o.expectedExecution?.start ?? maand,
    plannedEnd: o.expectedExecution?.end ?? maand,
    scope: o.need,
  };
}

export function conversionFromDraft(d: ConversionDraft, bureau: BureauData): { ok: true; input: ConvertInput } | { ok: false; errors: Partial<Record<keyof ConversionDraft, string>> } {
  const errors: Partial<Record<keyof ConversionDraft, string>> = {};
  if (!d.clientName.trim()) errors.clientName = 'Vul de klant in.';
  if (!d.name.trim()) errors.name = 'Geef het project een naam.';
  if (!OFFER_TYPES.includes(d.offerType)) errors.offerType = 'Kies een aanbodtype.';
  const prijs = parseNumber(d.fixedPriceExVat);
  if (prijs === null) errors.fixedPriceExVat = d.fixedPriceExVat.trim() ? 'Geen bedrag — bv. 18.000.' : 'Vul de getekende prijs in.';
  else if (prijs < 0) errors.fixedPriceExVat = 'Mag niet negatief zijn.';
  if (!MONTH.test(d.plannedStart)) errors.plannedStart = 'Een maand, bv. 2027-02.';
  if (!MONTH.test(d.plannedEnd)) errors.plannedEnd = 'Een maand, bv. 2027-06.';
  else if (!errors.plannedStart && d.plannedEnd < d.plannedStart) errors.plannedEnd = 'Het einde ligt vóór de start.';
  if (Object.keys(errors).length) return { ok: false, errors };
  const clientId = findClientByName(bureau, d.clientName);
  return {
    ok: true,
    input: {
      name: d.name.trim(), offerType: d.offerType, fixedPriceExVat: prijs!, plannedStart: d.plannedStart, plannedEnd: d.plannedEnd,
      scope: d.scope.trim(), clientId, newClientName: clientId ? null : d.clientName.trim(),
    },
  };
}
