/**
 * Maakt van een willekeurige `bureau`-waarde uit het document een bruikbare `BureauData`.
 *
 * Zelfde rol als `normalizeData` voor de maandprognose: jsonb garandeert niets, en één
 * ontbrekende array laat een scherm crashen op `.filter` van undefined. Een document van vóór
 * store-versie 16 heeft de sleutel helemaal niet; dan is de lege vorm het antwoord.
 *
 * Tolerant, niet streng: een onbekende waarde valt terug op een veilige default in plaats van
 * het hele document te weigeren — weigeren zou Jeroens maandprognose onbereikbaar maken om een
 * fout in een bureau-veld.
 */
import type {
  BureauData,
  BusinessGoals,
  Client,
  ClientGroup,
  Extension,
  ExternalCost,
  Invoice,
  Milestone,
  Opportunity,
  PlannedWork,
  Project,
  StageChange,
  TimeEntry,
} from './types.ts';
import {
  BUDGET_STATUSES,
  INVOICE_KINDS,
  OFFER_TYPES,
  PROJECT_STATUSES,
  STAGES,
  TIME_LABELS,
  WORK_CATEGORIES,
} from './types.ts';
import { DEFAULT_HOURS_PER_DAY, defaultGoals } from './goals.ts';

type Rec = Record<string, unknown>;

const rec = (x: unknown): Rec => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Rec) : {});
const num = (x: unknown, d: number): number => (typeof x === 'number' && Number.isFinite(x) ? x : d);
const numOrNull = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const str = (x: unknown, d = ''): string => (typeof x === 'string' ? x : d);
const strOrNull = (x: unknown): string | null => (typeof x === 'string' && x !== '' ? x : null);
const bool = (x: unknown, d = false): boolean => (typeof x === 'boolean' ? x : d);
const oneOf = <T extends string>(x: unknown, list: readonly T[], d: T): T =>
  typeof x === 'string' && (list as readonly string[]).includes(x) ? (x as T) : d;
const oneOfOrNull = <T extends string>(x: unknown, list: readonly T[]): T | null =>
  typeof x === 'string' && (list as readonly string[]).includes(x) ? (x as T) : null;
const list = <T>(x: unknown, fill: (r: Rec) => T | null): T[] =>
  Array.isArray(x) ? x.map((v) => (v && typeof v === 'object' ? fill(v as Rec) : null)).filter((v): v is T => v !== null) : [];
/** Een record zonder id kan nergens naar verwezen worden en wordt weggelaten. */
const id = (r: Rec): string | null => (typeof r.id === 'string' && r.id !== '' ? r.id : null);

export function emptyBureau(): BureauData {
  return { goals: {}, clients: [], clientGroups: [], projects: [], opportunities: [], timeEntries: [], plannedWork: [] };
}

export function normalizeGoals(year: number, input: unknown): BusinessGoals {
  const d = defaultGoals(year);
  const g = rec(input);
  const days = rec(g.days);
  const cats = rec(days.perCategory);
  const sig = rec(g.signals);
  const q = Array.isArray(g.quarterTargets) && g.quarterTargets.length === 4 && g.quarterTargets.every((v) => typeof v === 'number')
    ? (g.quarterTargets as [number, number, number, number])
    : g.quarterTargets === null ? null : d.quarterTargets;
  const s = <K extends keyof BusinessGoals['signals']>(k: K) => ({ ...d.signals[k], ...pickKnown(rec(sig[k]), d.signals[k]) });
  return {
    year,
    revenueTarget: num(g.revenueTarget, d.revenueTarget),
    quarterTargets: q,
    days: {
      total: num(days.total, d.days.total),
      buffer: num(days.buffer, d.days.buffer),
      perCategory: Object.fromEntries(WORK_CATEGORIES.map((c) => [c, num(cats[c], d.days.perCategory[c])])) as BusinessGoals['days']['perCategory'],
    },
    hoursPerDay: num(g.hoursPerDay, d.hoursPerDay) > 0 ? num(g.hoursPerDay, d.hoursPerDay) : DEFAULT_HOURS_PER_DAY,
    daysPerWeek: num(g.daysPerWeek, d.daysPerWeek),
    maxClientShare: num(g.maxClientShare, d.maxClientShare),
    monthlyCashNeed: num(g.monthlyCashNeed, d.monthlyCashNeed),
    targetRevenuePerDay: numOrNull(g.targetRevenuePerDay),
    targetMarginPerDay: numOrNull(g.targetMarginPerDay),
    signals: {
      negativeCash: s('negativeCash'),
      overbooking: s('overbooking'),
      projectOverrun: s('projectOverrun'),
      clientConcentration: s('clientConcentration'),
      overdueSalesAction: s('overdueSalesAction'),
      revenueGap: s('revenueGap'),
    },
  };
}

/** Neemt alleen velden over die de default kent, met hetzelfde type. */
function pickKnown<T extends object>(input: Rec, shape: T): Partial<T> {
  const out: Rec = {};
  for (const [k, v] of Object.entries(shape)) {
    if (typeof input[k] === typeof v && (typeof v !== 'number' || Number.isFinite(input[k]))) out[k] = input[k];
  }
  return out as Partial<T>;
}

const milestone = (r: Rec): Milestone | null => {
  const i = id(r);
  if (!i) return null;
  return {
    id: i,
    label: str(r.label),
    plannedMonth: str(r.plannedMonth),
    amount: num(r.amount, 0),
    realizedOn: strOrNull(r.realizedOn),
    realizedAmount: numOrNull(r.realizedAmount),
    extensionId: strOrNull(r.extensionId),
  };
};

const extension = (r: Rec): Extension | null => {
  const i = id(r);
  return i
    ? { id: i, label: str(r.label), approvedOn: str(r.approvedOn), amount: num(r.amount, 0), extraBudgetedHours: numOrNull(r.extraBudgetedHours) }
    : null;
};

const externalCost = (r: Rec): ExternalCost | null => {
  const i = id(r);
  return i ? { id: i, label: str(r.label), expected: num(r.expected, 0), actual: numOrNull(r.actual) } : null;
};

const invoice = (r: Rec): Invoice | null => {
  const i = id(r);
  if (!i) return null;
  return {
    id: i,
    label: str(r.label),
    kind: oneOf(r.kind, INVOICE_KINDS, 'overig'),
    date: str(r.date),
    amountExVat: num(r.amountExVat, 0),
    vatRate: num(r.vatRate, 21),
    dueDate: str(r.dueDate),
    expectedPaymentDate: strOrNull(r.expectedPaymentDate),
    paidOn: strOrNull(r.paidOn),
    paidAmount: numOrNull(r.paidAmount),
    incomeItemId: strOrNull(r.incomeItemId),
  };
};

const project = (r: Rec): Project | null => {
  const i = id(r);
  if (!i) return null;
  return {
    id: i,
    clientId: str(r.clientId),
    name: str(r.name),
    offerType: oneOf(r.offerType, OFFER_TYPES, 'overig'),
    status: oneOf(r.status, PROJECT_STATUSES, 'gepland'),
    scope: str(r.scope),
    contractDate: str(r.contractDate),
    plannedStart: str(r.plannedStart),
    plannedEnd: str(r.plannedEnd),
    fixedPriceExVat: num(r.fixedPriceExVat, 0),
    extensions: list(r.extensions, extension),
    budgetedOwnHours: numOrNull(r.budgetedOwnHours),
    expectedRemainingOwnHours: numOrNull(r.expectedRemainingOwnHours),
    externalCosts: list(r.externalCosts, externalCost),
    milestones: list(r.milestones, milestone),
    invoices: list(r.invoices, invoice),
    nextMilestoneNote: str(r.nextMilestoneNote),
    blockers: str(r.blockers),
    opportunityId: strOrNull(r.opportunityId),
    createdAt: str(r.createdAt),
  };
};

const timeEntry = (r: Rec): TimeEntry | null => {
  const i = id(r);
  if (!i) return null;
  return {
    id: i,
    date: str(r.date),
    category: oneOf(r.category, WORK_CATEGORIES, 'administratie'),
    projectId: strOrNull(r.projectId),
    hours: num(r.hours, 0),
    // Een registratie zonder vastgelegde conventie kreeg die van toen: de default.
    hoursPerDayAtEntry: num(r.hoursPerDayAtEntry, DEFAULT_HOURS_PER_DAY) > 0 ? num(r.hoursPerDayAtEntry, DEFAULT_HOURS_PER_DAY) : DEFAULT_HOURS_PER_DAY,
    label: oneOfOrNull(r.label, TIME_LABELS),
    note: str(r.note),
  };
};

const plannedWork = (r: Rec): PlannedWork | null => {
  const i = id(r);
  if (!i) return null;
  return {
    id: i,
    periodKind: r.periodKind === 'week' ? 'week' : 'month',
    periodKey: str(r.periodKey),
    category: oneOf(r.category, WORK_CATEGORIES, 'klantwerk'),
    projectId: strOrNull(r.projectId),
    days: num(r.days, 0),
  };
};

const stageChange = (r: Rec): StageChange | null =>
  typeof r.stage === 'string' && (STAGES as readonly string[]).includes(r.stage)
    ? { stage: r.stage as StageChange['stage'], on: str(r.on), reason: strOrNull(r.reason) }
    : null;

const opportunity = (r: Rec): Opportunity | null => {
  const i = id(r);
  if (!i) return null;
  const stage = oneOf(r.stage, STAGES, 'contact');
  const createdAt = str(r.createdAt);
  const history = list(r.history, stageChange);
  const trigger = rec(r.trigger);
  const budget = rec(r.budget);
  const exec = rec(r.expectedExecution);
  const next = rec(r.nextAction);
  return {
    id: i,
    company: str(r.company),
    contact: str(r.contact),
    clientId: strOrNull(r.clientId),
    trigger: { description: str(trigger.description), source: str(trigger.source), date: strOrNull(trigger.date) },
    need: str(r.need),
    offerType: oneOfOrNull(r.offerType, OFFER_TYPES),
    budget: { status: oneOf(budget.status, BUDGET_STATUSES, 'onbekend'), amount: numOrNull(budget.amount) },
    expectedValue: numOrNull(r.expectedValue),
    stage,
    // Zonder historie is de enige bekende overgang: de kans bestaat, in zijn huidige stadium.
    history: history.length > 0 ? history : [{ stage, on: createdAt, reason: null }],
    decisionMakerInvolved: bool(r.decisionMakerInvolved),
    expectedDecisionDate: strOrNull(r.expectedDecisionDate),
    expectedExecution: typeof exec.start === 'string' && typeof exec.end === 'string' ? { start: exec.start, end: exec.end } : null,
    nextAction: typeof next.text === 'string' && typeof next.date === 'string' ? { text: next.text, date: next.date } : null,
    outcomeReason: strOrNull(r.outcomeReason),
    projectId: strOrNull(r.projectId),
    createdAt,
  };
};

export function normalizeBureau(input: unknown): BureauData {
  const b = rec(input);
  const goalsIn = rec(b.goals);
  const goals: Record<string, BusinessGoals> = {};
  for (const [key, value] of Object.entries(goalsIn)) {
    const year = Number(key);
    if (Number.isInteger(year) && year > 1900 && year < 3000) goals[String(year)] = normalizeGoals(year, value);
  }
  return {
    goals,
    clients: list(b.clients, (r): Client | null => (id(r) ? { id: id(r)!, name: str(r.name), groupId: strOrNull(r.groupId) } : null)),
    clientGroups: list(b.clientGroups, (r): ClientGroup | null => (id(r) ? { id: id(r)!, name: str(r.name) } : null)),
    projects: list(b.projects, project),
    opportunities: list(b.opportunities, opportunity),
    timeEntries: list(b.timeEntries, timeEntry),
    plannedWork: list(b.plannedWork, plannedWork),
  };
}
