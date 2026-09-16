/**
 * Het bureau-domein: doelen, klanten, projecten, tijd en verkoop.
 *
 * Leeft als één sleutel `bureau` in hetzelfde document als de maandprognose
 * (`cashflow_state.data`), zodat sync, RLS en revisieconflicten het zonder extra pad dekken.
 *
 * Twee conventies die elke lezer hoort te kennen:
 *   - **Omzet is ex btw, cash is incl. btw.** Mijlpalen, prijzen en uitbreidingen zijn ex btw;
 *     een factuur draagt `amountExVat` plus `vatRate`, en een gekoppelde inkomstenpost in de
 *     maandprognose staat incl. btw, zoals elke andere inkomst daar.
 *   - **Enumeraties zijn `as const`-arrays, geen `enum`.** De tests draaien op Node met
 *     type-stripping, en die kent geen `enum`.
 */
import type { MonthKey } from '../cashflow/types.ts';

export type IsoDate = string; // 'yyyy-MM-dd'
export type WeekKey = string; // ISO-week 'yyyy-Www', bv. '2027-W05'

export const WORK_CATEGORIES = ['klantwerk', 'verkoop', 'umanex-os', 'administratie'] as const;
export type WorkCategory = (typeof WORK_CATEGORIES)[number];

export const TIME_LABELS = ['herstel', 'revisie', 'ongepland'] as const;
export type TimeLabel = (typeof TIME_LABELS)[number];

export const OFFER_TYPES = [
  'productdiagnose',
  'conceptvalidatie',
  'workflowtraject',
  'design-system',
  'productbegeleiding',
  'overig',
] as const;
export type OfferType = (typeof OFFER_TYPES)[number];

export const PROJECT_STATUSES = ['gepland', 'lopend', 'gepauzeerd', 'afgerond', 'geannuleerd'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const INVOICE_KINDS = ['voorschot', 'termijn', 'slot', 'overig'] as const;
export type InvoiceKind = (typeof INVOICE_KINDS)[number];

export const BUDGET_STATUSES = ['besproken', 'geschat', 'onbekend'] as const;
export type BudgetStatus = (typeof BUDGET_STATUSES)[number];

export const STAGES = [
  'contact',
  'gesprek',
  'gekwalificeerd',
  'voorstel',
  'gewonnen',
  'verloren',
  'geparkeerd',
] as const;
export type OpportunityStage = (typeof STAGES)[number];
export const OPEN_STAGES: readonly OpportunityStage[] = ['contact', 'gesprek', 'gekwalificeerd', 'voorstel'];

// ── Doelen per boekjaar ───────────────────────────────────────────────────────

export type SignalThresholds = {
  /** Verwacht vrij saldo onder deze vloer in een van de 13 weken. */
  /** Kritiek als een maandeinde binnen de 13 weken onder de vloer zakt; info als alleen de weektabel dat doet. */
  negativeCash: { enabled: boolean; floor: number };
  /** Overbelasting in dagen die nog getolereerd wordt, bovenop de buffer. */
  overbooking: { enabled: boolean; toleranceDays: number };
  /** (besteed + resterend) ÷ begroot boven deze verhouding. */
  projectOverrun: { enabled: boolean; ratio: number };
  /** Gebruikt `maxClientShare` als grens. */
  clientConcentration: { enabled: boolean };
  /** Dagen na de datum van de volgende actie voor ze als verlopen telt. */
  overdueSalesAction: { enabled: boolean; graceDays: number };
  /** Omzetgat zonder genoeg vrije klantdagen tegen het doeltarief. */
  revenueGap: { enabled: boolean };
};

export type BusinessGoals = {
  year: number;
  /** Omzetdoel ex btw. */
  revenueTarget: number;
  /** Q1–Q4 ex btw. Mag afwijken van het jaardoel: dat wordt getoond, nooit gecorrigeerd. */
  quarterTargets: [number, number, number, number] | null;
  days: {
    total: number;
    /** Gereserveerde capaciteit, geen registratiecategorie. */
    buffer: number;
    perCategory: Record<WorkCategory, number>;
  };
  /** Rekenconventie; wordt per tijdregistratie vastgelegd, zodat een wijziging historiek niet raakt. */
  hoursPerDay: number;
  /** Weekplafond voor overboeking per week. */
  daysPerWeek: number;
  /** 0..1 */
  maxClientShare: number;
  /** Planningsaanname. Wordt enkel vergeleken met de geregistreerde uitstroom, nooit opgeteld. */
  monthlyCashNeed: number;
  /** Doel voor A (omzet per eigen projectdag). `null` → omzetdoel ÷ klantwerkdagen. */
  targetRevenuePerDay: number | null;
  /** Doel voor B (opbrengst na directe externe kosten per dag). Apart, nooit afgeleid. */
  targetMarginPerDay: number | null;
  signals: SignalThresholds;
};

// ── Klanten ───────────────────────────────────────────────────────────────────

export type ClientGroup = { id: string; name: string };
export type Client = { id: string; name: string; groupId: string | null };

// ── Projecten ─────────────────────────────────────────────────────────────────

/**
 * Een stuk opdrachtwaarde ex btw. Gerealiseerd zodra `realizedOn` gezet is, anders nog te
 * leveren. Een mijlpaal is nooit allebei — daarom overlappen gerealiseerd en resterend niet.
 */
export type Milestone = {
  id: string;
  label: string;
  plannedMonth: MonthKey;
  amount: number;
  realizedOn: IsoDate | null;
  /** Wijkt het gerealiseerde bedrag af van het geplande, dan staat het hier. */
  realizedAmount: number | null;
  extensionId: string | null;
};

export type Extension = {
  id: string;
  label: string;
  approvedOn: IsoDate;
  amount: number;
  extraBudgetedHours: number | null;
};

/** Directe externe kost (freelancer, licentie, onderzoeksbudget). Nooit eigen capaciteit. */
export type ExternalCost = {
  id: string;
  label: string;
  expected: number;
  actual: number | null;
};

export type Invoice = {
  id: string;
  label: string;
  kind: InvoiceKind;
  date: IsoDate;
  amountExVat: number;
  /** Percentage, bv. 21. */
  vatRate: number;
  dueDate: IsoDate;
  expectedPaymentDate: IsoDate | null;
  paidOn: IsoDate | null;
  /** Werkelijk ontvangen, incl. btw. */
  paidAmount: number | null;
  /** De inkomstenpost in de maandprognose die deze factuur vertegenwoordigt. */
  incomeItemId: string | null;
};

export type Project = {
  id: string;
  clientId: string;
  name: string;
  offerType: OfferType;
  status: ProjectStatus;
  scope: string;
  /** Een project is per definitie getekend; ongetekend werk is een kans. */
  contractDate: IsoDate;
  plannedStart: MonthKey;
  plannedEnd: MonthKey;
  fixedPriceExVat: number;
  extensions: Extension[];
  budgetedOwnHours: number | null;
  expectedRemainingOwnHours: number | null;
  externalCosts: ExternalCost[];
  milestones: Milestone[];
  invoices: Invoice[];
  nextMilestoneNote: string;
  blockers: string;
  opportunityId: string | null;
  createdAt: IsoDate;
};

// ── Tijd ──────────────────────────────────────────────────────────────────────

/** Eigen actieve inzet. Agent-looptijd en freelancer-uren horen hier niet. */
export type TimeEntry = {
  id: string;
  date: IsoDate;
  category: WorkCategory;
  /** Verplicht bij klantwerk, anders `null`. */
  projectId: string | null;
  hours: number;
  /** Uren per dag op het moment van registreren: dagen = uren ÷ deze waarde, ook na een wijziging. */
  hoursPerDayAtEntry: number;
  label: TimeLabel | null;
  note: string;
};

/** Resterend gepland werk in dagen voor een week of maand. Periodes die voorbij zijn tellen niet. */
export type PlannedWork = {
  id: string;
  periodKind: 'week' | 'month';
  periodKey: WeekKey | MonthKey;
  category: WorkCategory;
  projectId: string | null;
  days: number;
};

// ── Verkoop ───────────────────────────────────────────────────────────────────

export type StageChange = { stage: OpportunityStage; on: IsoDate; reason: string | null };

export type Opportunity = {
  id: string;
  company: string;
  contact: string;
  clientId: string | null;
  trigger: { description: string; source: string; date: IsoDate | null };
  need: string;
  offerType: OfferType | null;
  budget: { status: BudgetStatus; amount: number | null };
  /** Verwachte opdrachtwaarde ex btw. Nooit gewogen met een kans per fase. */
  expectedValue: number | null;
  stage: OpportunityStage;
  /** Alleen aangevuld, nooit herschreven — conversiecijfers lezen deze lijst. */
  history: StageChange[];
  decisionMakerInvolved: boolean;
  expectedDecisionDate: IsoDate | null;
  expectedExecution: { start: MonthKey; end: MonthKey } | null;
  nextAction: { text: string; date: IsoDate } | null;
  /** Reden van verlies of uitstel. */
  outcomeReason: string | null;
  projectId: string | null;
  createdAt: IsoDate;
};

// ── Wortel ────────────────────────────────────────────────────────────────────

export type BureauData = {
  /** Sleutel = het jaar als string (jsonb-sleutels zijn strings). */
  goals: Record<string, BusinessGoals>;
  clients: Client[];
  clientGroups: ClientGroup[];
  projects: Project[];
  opportunities: Opportunity[];
  timeEntries: TimeEntry[];
  plannedWork: PlannedWork[];
};
