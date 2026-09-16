/**
 * Alle schrijfacties van het bureau, als pure functies op een draft.
 *
 * De store roept ze aan binnen immer's `set()`; de tests geven een gewoon object mee. Zo zijn de
 * overgangen die dubbeltelling moeten voorkomen — factuur ⇄ inkomstenpost, kans → project —
 * toetsbaar zonder zustand, en bestaat er één implementatie in plaats van een store-actie plus
 * een kopie in de test.
 *
 * Ids komen van de aanroeper. Dat houdt tests deterministisch en volgt `addIncomeItem(item)`.
 *
 * Een actie die geweigerd kan worden geeft haar uitkomst terug in plaats van stil niets te doen;
 * de UI valideert vooraf, maar de regel woont hier.
 */
import type { IncomeItem, MonthKey, MonthSnapshot } from '../cashflow/types.ts';
import type {
  BureauData,
  BusinessGoals,
  Client,
  ClientGroup,
  Extension,
  ExternalCost,
  Invoice,
  IsoDate,
  Milestone,
  OfferType,
  Opportunity,
  OpportunityStage,
  PlannedWork,
  Project,
  TimeEntry,
} from './types.ts';
import { hoursPerDayFor } from './goals.ts';
import { approvedTotal, invoiceGross, round2 } from './money.ts';
import { monthOf, monthsBetween, yearOf } from './periods.ts';

export type BureauDraft = {
  bureau: BureauData;
  incomeItems: IncomeItem[];
  monthSnapshots: MonthSnapshot[];
};

const isFrozen = (d: BureauDraft, m: MonthKey) => d.monthSnapshots.some((s) => s.monthKey === m);
const findProject = (d: BureauDraft, id: string) => d.bureau.projects.find((p) => p.id === id);
const findInvoice = (d: BureauDraft, projectId: string, invoiceId: string) =>
  findProject(d, projectId)?.invoices.find((i) => i.id === invoiceId);

// ── Doelen ────────────────────────────────────────────────────────────────────

export function setGoals(d: BureauDraft, goals: BusinessGoals): void {
  d.bureau.goals[String(goals.year)] = goals;
}

export function removeGoals(d: BureauDraft, year: number): void {
  delete d.bureau.goals[String(year)];
}

// ── Klanten ───────────────────────────────────────────────────────────────────

export function upsertClient(d: BureauDraft, client: Client): void {
  const existing = d.bureau.clients.find((c) => c.id === client.id);
  if (existing) Object.assign(existing, client);
  else d.bureau.clients.push(client);
}

/** Geweigerd zolang een project of kans naar de klant verwijst — anders verdwijnt zijn omzet uit de concentratie. */
export function removeClient(d: BureauDraft, id: string): 'ok' | 'in-gebruik' {
  const used = d.bureau.projects.some((p) => p.clientId === id) || d.bureau.opportunities.some((o) => o.clientId === id);
  if (used) return 'in-gebruik';
  d.bureau.clients = d.bureau.clients.filter((c) => c.id !== id);
  return 'ok';
}

export function upsertClientGroup(d: BureauDraft, group: ClientGroup): void {
  const existing = d.bureau.clientGroups.find((g) => g.id === group.id);
  if (existing) Object.assign(existing, group);
  else d.bureau.clientGroups.push(group);
}

export function removeClientGroup(d: BureauDraft, id: string): void {
  d.bureau.clientGroups = d.bureau.clientGroups.filter((g) => g.id !== id);
  for (const c of d.bureau.clients) if (c.groupId === id) c.groupId = null;
}

// ── Projecten ─────────────────────────────────────────────────────────────────

export type ProjectFields = Omit<Project, 'extensions' | 'externalCosts' | 'milestones' | 'invoices' | 'opportunityId' | 'createdAt'>;

export function addProject(d: BureauDraft, fields: ProjectFields, createdAt: IsoDate): void {
  d.bureau.projects.push({ ...fields, extensions: [], externalCosts: [], milestones: [], invoices: [], opportunityId: null, createdAt });
}

export function updateProject(d: BureauDraft, id: string, patch: Partial<ProjectFields>): void {
  const p = findProject(d, id);
  if (p) Object.assign(p, { ...patch, id: p.id });
}

/**
 * Geweigerd zolang er uren op geregistreerd staan: die uren zijn historiek en mogen niet
 * verweesd raken. Gekoppelde inkomstenposten in open maanden gaan mee weg.
 */
export function removeProject(d: BureauDraft, id: string): 'ok' | 'heeft-uren' {
  if (d.bureau.timeEntries.some((e) => e.projectId === id)) return 'heeft-uren';
  const p = findProject(d, id);
  if (!p) return 'ok';
  for (const inv of p.invoices) removeLinkedIncome(d, inv);
  d.bureau.projects = d.bureau.projects.filter((x) => x.id !== id);
  d.bureau.plannedWork = d.bureau.plannedWork.filter((w) => w.projectId !== id);
  for (const o of d.bureau.opportunities) if (o.projectId === id) o.projectId = null;
  return 'ok';
}

// ── Mijlpalen, uitbreidingen, externe kosten ──────────────────────────────────

export function upsertMilestone(d: BureauDraft, projectId: string, m: Milestone): void {
  const p = findProject(d, projectId);
  if (!p) return;
  const existing = p.milestones.find((x) => x.id === m.id);
  if (existing) Object.assign(existing, m);
  else p.milestones.push(m);
}

export function removeMilestone(d: BureauDraft, projectId: string, id: string): void {
  const p = findProject(d, projectId);
  if (p) p.milestones = p.milestones.filter((m) => m.id !== id);
}

/** Gerealiseerd op `on`. `amount` alleen als het gerealiseerde bedrag afwijkt van het geplande. */
export function realizeMilestone(d: BureauDraft, projectId: string, id: string, on: IsoDate, amount: number | null): void {
  const m = findProject(d, projectId)?.milestones.find((x) => x.id === id);
  if (!m) return;
  m.realizedOn = on;
  m.realizedAmount = amount;
}

export function unrealizeMilestone(d: BureauDraft, projectId: string, id: string): void {
  const m = findProject(d, projectId)?.milestones.find((x) => x.id === id);
  if (!m) return;
  m.realizedOn = null;
  m.realizedAmount = null;
}

/**
 * Eén mijlpaal per maand van de geplande periode, samen precies de goedgekeurde prijs — de vorm
 * voor capaciteit in dagen per maand. Afrondingsverschil landt in de laatste maand.
 * Alleen op een project zonder mijlpalen: bij bestaande is "de som klopt" niet meer waar te maken.
 */
export function addMonthlyMilestones(
  d: BureauDraft,
  projectId: string,
  ids: string[],
  labelFor: (month: MonthKey) => string,
): 'ok' | 'heeft-mijlpalen' | 'geen-periode' | 'ids-tekort' {
  const p = findProject(d, projectId);
  if (!p) return 'geen-periode';
  if (p.milestones.length > 0) return 'heeft-mijlpalen';
  const months = monthsBetween(p.plannedStart, p.plannedEnd);
  if (months.length === 0) return 'geen-periode';
  if (ids.length < months.length) return 'ids-tekort';
  const total = approvedTotal(p);
  const each = round2(total / months.length);
  months.forEach((month, i) => {
    const isLast = i === months.length - 1;
    p.milestones.push({
      id: ids[i]!,
      label: labelFor(month),
      plannedMonth: month,
      amount: isLast ? round2(total - each * (months.length - 1)) : each,
      realizedOn: null,
      realizedAmount: null,
      extensionId: null,
    });
  });
  return 'ok';
}

export function upsertExtension(d: BureauDraft, projectId: string, e: Extension): void {
  const p = findProject(d, projectId);
  if (!p) return;
  const existing = p.extensions.find((x) => x.id === e.id);
  if (existing) Object.assign(existing, e);
  else p.extensions.push(e);
}

/** Een uitbreiding intrekken neemt haar mijlpalen mee: zonder uitbreiding bestaat die waarde niet. */
export function removeExtension(d: BureauDraft, projectId: string, id: string): void {
  const p = findProject(d, projectId);
  if (!p) return;
  p.extensions = p.extensions.filter((e) => e.id !== id);
  p.milestones = p.milestones.filter((m) => m.extensionId !== id);
}

export function upsertExternalCost(d: BureauDraft, projectId: string, c: ExternalCost): void {
  const p = findProject(d, projectId);
  if (!p) return;
  const existing = p.externalCosts.find((x) => x.id === c.id);
  if (existing) Object.assign(existing, c);
  else p.externalCosts.push(c);
}

export function removeExternalCost(d: BureauDraft, projectId: string, id: string): void {
  const p = findProject(d, projectId);
  if (p) p.externalCosts = p.externalCosts.filter((c) => c.id !== id);
}

// ── Facturen en de maandprognose ──────────────────────────────────────────────
//
// Eén factuur, hoogstens één inkomstenpost. De post staat in de maand van de verwachte
// betaaldatum (of de vervaldatum) en draagt het bedrag incl. btw. Zodra de factuur betaald is,
// verdwijnt de post — zo werkt Jeroen al: wat binnen is, staat niet meer als te ontvangen in de
// prognose. Een post in een afgesloten maand blijft staan, want die maand is bevroren.

/** De maand waarin de gekoppelde post hoort te staan. */
export function ledgerMonthFor(i: Invoice): MonthKey {
  return monthOf(i.expectedPaymentDate ?? i.dueDate);
}

function removeLinkedIncome(d: BureauDraft, inv: Invoice): 'verwijderd' | 'afgesloten-maand' | 'geen-post' {
  if (!inv.incomeItemId) return 'geen-post';
  const item = d.incomeItems.find((x) => x.id === inv.incomeItemId);
  if (!item) {
    inv.incomeItemId = null;
    return 'geen-post';
  }
  if (isFrozen(d, item.monthKey)) return 'afgesloten-maand';
  d.incomeItems = d.incomeItems.filter((x) => x.id !== item.id);
  inv.incomeItemId = null;
  return 'verwijderd';
}

function createLinkedIncome(d: BureauDraft, inv: Invoice, incomeItemId: string, label: string): 'ok' | 'afgesloten-maand' {
  const monthKey = ledgerMonthFor(inv);
  if (isFrozen(d, monthKey)) return 'afgesloten-maand';
  d.incomeItems.push({ id: incomeItemId, monthKey, label, amount: invoiceGross(inv), received: false });
  inv.incomeItemId = incomeItemId;
  return 'ok';
}

export function addInvoice(
  d: BureauDraft,
  projectId: string,
  invoice: Omit<Invoice, 'incomeItemId'>,
  ledger: { incomeItemId: string; label: string } | null,
): 'ok' | 'geen-project' | 'afgesloten-maand' {
  const p = findProject(d, projectId);
  if (!p) return 'geen-project';
  const inv: Invoice = { ...invoice, incomeItemId: null };
  p.invoices.push(inv);
  // Een betaalde factuur staat per definitie niet meer als te ontvangen in de prognose.
  return ledger && inv.paidOn === null ? createLinkedIncome(d, inv, ledger.incomeItemId, ledger.label) : 'ok';
}

/** Houdt een gekoppelde post in een open maand gelijk met de factuur. */
export function updateInvoice(d: BureauDraft, projectId: string, invoiceId: string, patch: Partial<Omit<Invoice, 'id' | 'incomeItemId' | 'paidOn' | 'paidAmount'>>): void {
  const inv = findInvoice(d, projectId, invoiceId);
  if (!inv) return;
  Object.assign(inv, patch);
  const item = inv.incomeItemId ? d.incomeItems.find((x) => x.id === inv.incomeItemId) : undefined;
  if (!item || isFrozen(d, item.monthKey)) return;
  const target = ledgerMonthFor(inv);
  if (isFrozen(d, target)) return;
  item.monthKey = target;
  item.amount = invoiceGross(inv);
}

export function removeInvoice(d: BureauDraft, projectId: string, invoiceId: string): void {
  const p = findProject(d, projectId);
  const inv = p?.invoices.find((i) => i.id === invoiceId);
  if (!p || !inv) return;
  removeLinkedIncome(d, inv);
  p.invoices = p.invoices.filter((i) => i.id !== invoiceId);
}

/** Zet een bestaande factuur in de prognose. */
export function linkInvoiceToLedger(
  d: BureauDraft,
  projectId: string,
  invoiceId: string,
  incomeItemId: string,
  label: string,
): 'ok' | 'al-gekoppeld' | 'betaald' | 'afgesloten-maand' | 'geen-factuur' {
  const inv = findInvoice(d, projectId, invoiceId);
  if (!inv) return 'geen-factuur';
  if (inv.incomeItemId) return 'al-gekoppeld';
  if (inv.paidOn) return 'betaald';
  return createLinkedIncome(d, inv, incomeItemId, label);
}

export function markInvoicePaid(
  d: BureauDraft,
  projectId: string,
  invoiceId: string,
  paidOn: IsoDate,
  paidAmount: number,
): 'verwijderd' | 'afgesloten-maand' | 'geen-post' | 'geen-factuur' {
  const inv = findInvoice(d, projectId, invoiceId);
  if (!inv) return 'geen-factuur';
  inv.paidOn = paidOn;
  inv.paidAmount = paidAmount;
  return removeLinkedIncome(d, inv);
}

/** Betaald ongedaan maken. Met `ledger` komt de post terug in de maand van de verwachte betaaldatum. */
export function unmarkInvoicePaid(
  d: BureauDraft,
  projectId: string,
  invoiceId: string,
  ledger: { incomeItemId: string; label: string } | null,
): 'ok' | 'afgesloten-maand' | 'geen-factuur' {
  const inv = findInvoice(d, projectId, invoiceId);
  if (!inv) return 'geen-factuur';
  inv.paidOn = null;
  inv.paidAmount = null;
  if (ledger && !inv.incomeItemId) return createLinkedIncome(d, inv, ledger.incomeItemId, ledger.label);
  return 'ok';
}

/** Een inkomstenpost verdween op de prognose: de factuur wijst er dan niet meer naar. */
export function onIncomeItemRemoved(d: BureauDraft, incomeItemId: string): void {
  for (const p of d.bureau.projects) for (const inv of p.invoices) if (inv.incomeItemId === incomeItemId) inv.incomeItemId = null;
}

// ── Tijd en planning ──────────────────────────────────────────────────────────

export type TimeEntryInput = Omit<TimeEntry, 'hoursPerDayAtEntry'>;
export type TimeEntryError = 'uren-ongeldig' | 'project-ontbreekt' | 'project-onbekend' | 'datum-ongeldig';

export function validateTimeEntry(d: BureauDraft, e: TimeEntryInput): TimeEntryError | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) return 'datum-ongeldig';
  if (!(e.hours > 0 && e.hours <= 24)) return 'uren-ongeldig';
  if (e.category === 'klantwerk') {
    if (!e.projectId) return 'project-ontbreekt';
    if (!findProject(d, e.projectId)) return 'project-onbekend';
  }
  return null;
}

/** Legt de uren-per-dag van dat jaar vast op de registratie, zodat een latere wijziging de historiek niet raakt. */
export function addTimeEntry(d: BureauDraft, e: TimeEntryInput): TimeEntryError | 'ok' {
  const error = validateTimeEntry(d, e);
  if (error) return error;
  d.bureau.timeEntries.push({
    ...e,
    projectId: e.category === 'klantwerk' ? e.projectId : null,
    hoursPerDayAtEntry: hoursPerDayFor(d.bureau, yearOf(e.date)),
  });
  return 'ok';
}

/** `hoursPerDayAtEntry` verandert nooit, ook niet als de datum naar een ander jaar schuift. */
export function updateTimeEntry(d: BureauDraft, id: string, patch: Partial<TimeEntryInput>): TimeEntryError | 'ok' | 'geen-registratie' {
  const entry = d.bureau.timeEntries.find((e) => e.id === id);
  if (!entry) return 'geen-registratie';
  const next: TimeEntryInput = { ...entry, ...patch, id: entry.id };
  const error = validateTimeEntry(d, next);
  if (error) return error;
  Object.assign(entry, next, { projectId: next.category === 'klantwerk' ? next.projectId : null });
  return 'ok';
}

export function removeTimeEntry(d: BureauDraft, id: string): void {
  d.bureau.timeEntries = d.bureau.timeEntries.filter((e) => e.id !== id);
}

export function upsertPlannedWork(d: BureauDraft, w: PlannedWork): void {
  const existing = d.bureau.plannedWork.find((x) => x.id === w.id);
  if (existing) Object.assign(existing, w);
  else d.bureau.plannedWork.push(w);
}

export function removePlannedWork(d: BureauDraft, id: string): void {
  d.bureau.plannedWork = d.bureau.plannedWork.filter((w) => w.id !== id);
}

// ── Verkoop ───────────────────────────────────────────────────────────────────

export type OpportunityFields = Omit<Opportunity, 'stage' | 'history' | 'projectId' | 'createdAt' | 'outcomeReason'>;

export function addOpportunity(d: BureauDraft, fields: OpportunityFields, stage: OpportunityStage, createdAt: IsoDate): void {
  d.bureau.opportunities.push({
    ...fields,
    stage,
    history: [{ stage, on: createdAt, reason: null }],
    outcomeReason: null,
    projectId: null,
    createdAt,
  });
}

export function updateOpportunity(d: BureauDraft, id: string, patch: Partial<OpportunityFields>): void {
  const o = d.bureau.opportunities.find((x) => x.id === id);
  if (o) Object.assign(o, { ...patch, id: o.id });
}

/** Voegt de overgang toe aan de historie; de historie wordt nooit herschreven. */
export function moveOpportunityStage(d: BureauDraft, id: string, stage: OpportunityStage, on: IsoDate, reason: string | null): void {
  const o = d.bureau.opportunities.find((x) => x.id === id);
  if (!o || o.stage === stage) return;
  o.stage = stage;
  o.history.push({ stage, on, reason });
  if (stage === 'verloren' || stage === 'geparkeerd') o.outcomeReason = reason;
}

export function removeOpportunity(d: BureauDraft, id: string): void {
  d.bureau.opportunities = d.bureau.opportunities.filter((o) => o.id !== id);
  for (const p of d.bureau.projects) if (p.opportunityId === id) p.opportunityId = null;
}

export type ConvertInput = {
  name: string;
  offerType: OfferType;
  fixedPriceExVat: number;
  plannedStart: MonthKey;
  plannedEnd: MonthKey;
  scope: string;
  /** Een bestaande klant, of `null` met `newClientName`. */
  clientId: string | null;
  newClientName: string | null;
};

/**
 * Een gewonnen kans wordt precies één project. Geweigerd als de kans al een project heeft of
 * een project al naar deze kans verwijst — de tweede controle vangt een half mislukte eerdere
 * conversie en een geïmporteerd document.
 */
export function convertOpportunity(
  d: BureauDraft,
  opportunityId: string,
  input: ConvertInput,
  ids: { projectId: string; clientId: string },
  now: IsoDate,
): 'ok' | 'geen-kans' | 'niet-gewonnen' | 'al-omgezet' | 'klant-ontbreekt' {
  const o = d.bureau.opportunities.find((x) => x.id === opportunityId);
  if (!o) return 'geen-kans';
  if (o.projectId || d.bureau.projects.some((p) => p.opportunityId === o.id)) return 'al-omgezet';
  if (o.stage !== 'gewonnen') return 'niet-gewonnen';

  let clientId = input.clientId;
  if (!clientId) {
    const name = input.newClientName?.trim();
    if (!name) return 'klant-ontbreekt';
    d.bureau.clients.push({ id: ids.clientId, name, groupId: null });
    clientId = ids.clientId;
  } else if (!d.bureau.clients.some((c) => c.id === clientId)) {
    return 'klant-ontbreekt';
  }

  d.bureau.projects.push({
    id: ids.projectId,
    clientId,
    name: input.name,
    offerType: input.offerType,
    status: 'gepland',
    scope: input.scope,
    contractDate: now,
    plannedStart: input.plannedStart,
    plannedEnd: input.plannedEnd,
    fixedPriceExVat: input.fixedPriceExVat,
    extensions: [],
    budgetedOwnHours: null,
    expectedRemainingOwnHours: null,
    externalCosts: [],
    milestones: [],
    invoices: [],
    nextMilestoneNote: '',
    blockers: '',
    opportunityId: o.id,
    createdAt: now,
  });
  o.projectId = ids.projectId;
  if (!o.clientId) o.clientId = clientId;
  return 'ok';
}
