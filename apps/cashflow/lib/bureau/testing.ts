/**
 * Fixtures voor de `node:test`-bestanden van het bureau. Niet door de app geïmporteerd.
 *
 * Bouwt volledige objecten in plaats van gedeeltelijke te casten: een cast verbergt precies het
 * veld dat een module later gaat lezen.
 */
import type { MonthData, MonthKey, MonthSubtotals, ReservationPotBalance } from '../cashflow/types.ts';
import type { BureauDraft } from './mutations.ts';
import type { Invoice, Opportunity, Project, TimeEntry } from './types.ts';
import { emptyBureau } from './normalize.ts';

export function draft(partial: Partial<BureauDraft> = {}): BureauDraft {
  return { bureau: emptyBureau(), incomeItems: [], monthSnapshots: [], ...partial };
}

export function subtotals(p: Partial<MonthSubtotals> & { basis: MonthSubtotals['basis'] }): MonthSubtotals {
  const s = { incoming: 0, recurring: 0, oneOff: 0, budgets: 0, provisions: 0, buffer: 0, ...p };
  const costs = s.recurring + s.oneOff + s.budgets + s.provisions + s.buffer;
  return { ...s, costs, endBalance: p.endBalance ?? s.incoming - costs };
}

export function pot(p: Partial<ReservationPotBalance> & { reservationId: string }): ReservationPotBalance {
  return {
    label: p.reservationId,
    monthlyAmount: 0,
    effectiveAmount: 0,
    hasSettlement: false,
    finalized: false,
    potBalance: 0,
    paymentsThisMonth: [],
    provisionThisMonth: 0,
    deferredFromPrevious: 0,
    potType: 'spaardoel',
    releasedThisMonth: 0,
    isDeficitBuffer: false,
    autoContribution: null,
    ...p,
  };
}

export function month(monthKey: MonthKey, p: Partial<Omit<MonthData, 'monthKey'>> & { subtotals: MonthSubtotals }): MonthData {
  return {
    monthKey,
    startBalance: p.subtotals.incoming - (p.totalIncome ?? 0),
    endBalance: p.subtotals.endBalance,
    cashOverflowItems: [],
    totalIncome: 0,
    totalRecurring: 0,
    totalReservationDeductions: 0,
    totalReservationCashPayments: 0,
    availableBudget: 0,
    totalOutstandingCosts: 0,
    incomeItems: [],
    recurringItems: [],
    recurringSettlements: [],
    reservationSettlements: [],
    reservationPots: [],
    reservationPayments: [],
    deferredRecurringAmount: 0,
    deferredItems: [],
    expenseItems: [],
    totalExpenses: 0,
    deferredReservationAmount: 0,
    deferredReservationItems: [],
    ...p,
  };
}

export function project(p: Partial<Project> & { id: string }): Project {
  return {
    clientId: 'klant-a',
    name: `Project ${p.id}`,
    offerType: 'workflowtraject',
    status: 'lopend',
    scope: '',
    contractDate: '2027-01-04',
    plannedStart: '2027-01',
    plannedEnd: '2027-06',
    fixedPriceExVat: 12_000,
    extensions: [],
    budgetedOwnHours: null,
    expectedRemainingOwnHours: null,
    externalCosts: [],
    milestones: [],
    invoices: [],
    nextMilestoneNote: '',
    blockers: '',
    opportunityId: null,
    createdAt: '2027-01-04',
    ...p,
  };
}

export function invoice(p: Partial<Invoice> & { id: string }): Invoice {
  return {
    label: `Factuur ${p.id}`,
    kind: 'termijn',
    date: '2027-01-15',
    amountExVat: 4_000,
    vatRate: 21,
    dueDate: '2027-02-14',
    expectedPaymentDate: null,
    paidOn: null,
    paidAmount: null,
    incomeItemId: null,
    ...p,
  };
}

export function timeEntry(p: Partial<TimeEntry> & { id: string }): TimeEntry {
  return { date: '2027-01-04', category: 'verkoop', projectId: null, hours: 4, hoursPerDayAtEntry: 8, label: null, note: '', ...p };
}

export function opportunity(p: Partial<Opportunity> & { id: string }): Opportunity {
  const stage = p.stage ?? 'contact';
  const createdAt = p.createdAt ?? '2027-01-04';
  return {
    company: `Bedrijf ${p.id}`,
    contact: '',
    clientId: null,
    trigger: { description: '', source: '', date: null },
    need: '',
    offerType: null,
    budget: { status: 'onbekend', amount: null },
    expectedValue: null,
    stage,
    history: [{ stage, on: createdAt, reason: null }],
    decisionMakerInvolved: false,
    expectedDecisionDate: null,
    expectedExecution: null,
    nextAction: null,
    outcomeReason: null,
    projectId: null,
    createdAt,
    ...p,
  };
}
