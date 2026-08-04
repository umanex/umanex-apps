/**
 * Refactor-vangnet voor de maandberekening.
 *
 * Dumpt een deterministische digest van élke berekende waarde over een brede set
 * gegenereerde scenario's: de calculator-output én de formules die de UI vandaag zelf
 * uitrekent (maandkaart-eindsaldo, KPI-tegels, sectiekoppen). Draai het script vóór en
 * ná een refactor en diff de twee bestanden — een lege diff bewijst dat er geen enkel
 * getal verschoven is.
 *
 *   tsx apps/cashflow/scripts/calc-baseline.ts > before.json
 *   ...refactor...
 *   tsx apps/cashflow/scripts/calc-baseline.ts > after.json
 *   diff before.json after.json
 *
 * De UI-formules staan hier bewust als bevroren kopie. Zolang ze hier los meelopen,
 * toetst de diff de gedeelde implementatie tegen het gedrag van vóór de refactor.
 */
import { calculateMonths, computeAnchorState } from '../lib/cashflow/calculator';
import type {
  BalanceOverride,
  ExpenseItem,
  IncomeItem,
  MonthData,
  MonthKey,
  RecurringDefer,
  RecurringItem,
  RecurringSettlement,
  ReservationDefer,
  ReservationItem,
  ReservationPayment,
  ReservationPotBalance,
  ReservationSettlement,
} from '../lib/cashflow/types';

// ── Deterministische generator ────────────────────────────────────────────────

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

const BASE_YEAR = 2026;

/** Maandsleutel op `offset` maanden na januari van het basisjaar. */
function monthAt(offset: number): MonthKey {
  const year = BASE_YEAR + Math.floor(offset / 12);
  const month = (offset % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

interface Scenario {
  seed: number;
  referenceBalance: number;
  referenceMonth: MonthKey;
  anchorMonth: MonthKey;
  expenseItems: ExpenseItem[];
  incomeItems: IncomeItem[];
  recurringItems: RecurringItem[];
  reservations: ReservationItem[];
  reservationPayments: ReservationPayment[];
  recurringDefers: RecurringDefer[];
  recurringSettlements: RecurringSettlement[];
  reservationDefers: ReservationDefer[];
  reservationSettlements: ReservationSettlement[];
  balanceOverrides: BalanceOverride[];
}

function buildScenario(seed: number): Scenario {
  const rng = makeRng(seed);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)]!;
  const int = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
  const money = (min: number, max: number) => Math.round((min + rng() * (max - min)) * 100) / 100;
  const chance = (p: number) => rng() < p;

  // Referentiemaand op index 2, anker 0-3 maanden verder: dekt zowel de directe
  // ankerberekening als de voorwaartse doorrol in computeAnchorState.
  const referenceMonth = monthAt(2);
  const anchorOffset = 2 + int(0, 3);
  const anchorMonth = monthAt(anchorOffset);
  // Het venster dat de app toont, plus een maand marge.
  const windowOffsets = [anchorOffset - 1, anchorOffset, anchorOffset + 1, anchorOffset + 2, anchorOffset + 3];

  const incomeItems: IncomeItem[] = [];
  for (let i = 0; i < int(0, 4); i++) {
    incomeItems.push({
      id: `inc-${seed}-${i}`,
      monthKey: monthAt(pick(windowOffsets)),
      label: `Inkomst ${i}`,
      amount: money(200, 6000),
      received: chance(0.5),
    });
  }

  const expenseItems: ExpenseItem[] = [];
  for (let i = 0; i < int(0, 4); i++) {
    expenseItems.push({
      id: `exp-${seed}-${i}`,
      monthKey: monthAt(pick(windowOffsets)),
      label: `Uitgave ${i}`,
      amount: money(20, 1500),
      paid: chance(0.5),
    });
  }

  const recurringItems: RecurringItem[] = [];
  for (let i = 0; i < int(0, 3); i++) {
    recurringItems.push({
      id: `rec-${seed}-${i}`,
      label: `Vast ${i}`,
      amount: money(50, 1200),
      type: 'expense',
      frequency: chance(0.25) ? 'yearly' : 'monthly',
      startMonth: monthAt(int(0, anchorOffset + 1)),
    });
  }

  const reservations: ReservationItem[] = [];
  for (let i = 0; i < int(0, 3); i++) {
    reservations.push({
      id: `res-${seed}-${i}`,
      label: `Pot ${i}`,
      monthlyAmount: money(50, 900),
      // Start vóór het venster levert een opgebouwde pot bij de ankermaand.
      startMonth: monthAt(int(0, anchorOffset)),
      type: chance(0.35) ? 'maandelijks_budget' : 'spaardoel',
    });
  }
  // Hoogstens één bufferpot, en enkel een spaardoel kan het zijn.
  const bufferCandidates = reservations.filter((r) => r.type === 'spaardoel');
  if (bufferCandidates.length > 0 && chance(0.5)) {
    pick(bufferCandidates).coversDeficit = true;
  }

  const reservationPayments: ReservationPayment[] = [];
  const reservationSettlements: ReservationSettlement[] = [];
  const reservationDefers: ReservationDefer[] = [];
  reservations.forEach((res, i) => {
    if (chance(0.45)) {
      const invoice = money(50, 1200);
      const fromReservation = Math.round(invoice * (chance(0.3) ? 0.6 : 1) * 100) / 100;
      reservationPayments.push({
        id: `pay-${seed}-${i}`,
        reservationId: res.id,
        monthKey: monthAt(pick(windowOffsets)),
        label: `Factuur ${i}`,
        invoiceAmount: invoice,
        fromReservation,
        fromCash: Math.round((invoice - fromReservation) * 100) / 100,
      });
    }
    if (chance(0.4)) {
      const finalized = chance(0.5);
      reservationSettlements.push({
        id: `rset-${seed}-${i}`,
        reservationId: res.id,
        monthKey: monthAt(pick(windowOffsets)),
        effectiveAmount: money(0, 900),
        finalized,
      });
    }
    if (chance(0.25)) {
      const from = pick(windowOffsets);
      reservationDefers.push({
        id: `rdef-${seed}-${i}`,
        reservationId: res.id,
        fromMonth: monthAt(from),
        toMonth: monthAt(from + 1),
      });
    }
  });

  const recurringDefers: RecurringDefer[] = [];
  const recurringSettlements: RecurringSettlement[] = [];
  recurringItems.forEach((item, i) => {
    if (chance(0.3)) {
      const from = pick(windowOffsets);
      const paid = chance(0.4);
      recurringDefers.push({
        id: `def-${seed}-${i}`,
        recurringId: item.id,
        fromMonth: monthAt(from),
        toMonth: monthAt(from + 1),
        paid,
        paidAmount: paid ? money(10, 1200) : 0,
      });
    }
    if (chance(0.4)) {
      recurringSettlements.push({
        id: `set-${seed}-${i}`,
        recurringId: item.id,
        monthKey: monthAt(pick(windowOffsets)),
        paid: chance(0.7),
        actualAmount: money(10, 1200),
      });
    }
  });

  const balanceOverrides: BalanceOverride[] = [];
  if (chance(0.3)) {
    balanceOverrides.push({
      id: `ovr-${seed}`,
      monthKey: monthAt(pick([2, anchorOffset - 1, anchorOffset])),
      balance: money(-2000, 9000),
    });
  }

  return {
    seed,
    referenceBalance: money(-1500, 12000),
    referenceMonth,
    anchorMonth,
    expenseItems,
    incomeItems,
    recurringItems,
    reservations,
    reservationPayments,
    recurringDefers,
    recurringSettlements,
    reservationDefers,
    reservationSettlements,
    balanceOverrides,
  };
}

// ── Bevroren kopie van de formules die de UI vandaag zelf uitrekent ───────────
//
// Deze functies zijn een letterlijke overname van MonthCard.tsx en de vier
// sectiecomponenten op het moment vóór de refactor. Niet meeveranderen met de
// productiecode — dat zou de vangnetfunctie wegnemen.

function paidFromPot(pot: ReservationPotBalance): number {
  return pot.paymentsThisMonth.reduce((s, pay) => s + pay.fromReservation, 0);
}

/** MonthCard.tsx — de vier kostensubtotalen, de KPI-tegels en het eindsaldo. */
function monthCardFigures(m: MonthData, isFirst: boolean) {
  const overflowItems = m.reservationPots
    .filter((p) => !p.finalized)
    .flatMap((p) => p.paymentsThisMonth.filter((pay) => pay.fromCash > 0).map((pay) => pay.fromCash));

  const unpaidExpensesTotal = m.expenseItems.filter((i) => !i.paid).reduce((s, i) => s + i.amount, 0);

  const vast =
    (m.totalOutstandingCosts - unpaidExpensesTotal) +
    m.deferredItems.filter((d) => !d.paid).reduce((s, d) => s + d.amount, 0);

  const eenmalig = unpaidExpensesTotal + overflowItems.reduce((s, a) => s + a, 0);

  const budgetten = m.reservationPots
    .filter((p) => p.potType === 'maandelijks_budget' && (!isFirst || !p.finalized))
    .reduce((s, p) => s + (p.provisionThisMonth - paidFromPot(p)), 0);

  const provisies =
    m.reservationPots
      .filter((p) => p.potType === 'spaardoel' && (!isFirst || !p.finalized))
      .reduce(
        (s, p) =>
          s +
          (isFirst
            ? p.deferredFromPrevious + p.provisionThisMonth - paidFromPot(p)
            : p.provisionThisMonth - p.releasedThisMonth),
        0,
      ) + m.deferredReservationItems.reduce((s, d) => s + d.amount, 0);

  const inkomsten = m.startBalance + m.totalIncome;
  const kosten = vast + eenmalig + budgetten + provisies;
  return { vast, eenmalig, budgetten, provisies, inkomsten, kosten, eindsaldo: inkomsten - kosten };
}

/** IncomeSection.tsx — kop van de inkomstensectie. */
function incomeHeader(m: MonthData): number {
  return m.startBalance + m.incomeItems.reduce((s, i) => s + i.amount, 0);
}

/** RecurringSection.tsx — kop van de vaste-uitgavensectie. */
function recurringHeader(m: MonthData): number {
  const unpaidItems = m.recurringItems.filter(
    (item) => !m.recurringSettlements.find((s) => s.recurringId === item.id && s.paid),
  );
  return (
    unpaidItems.reduce((s, item) => s + (item.frequency === 'yearly' ? item.amount / 12 : item.amount), 0) +
    m.deferredItems.filter((d) => !d.paid).reduce((s, d) => s + d.amount, 0)
  );
}

/** ExpenseSection.tsx — kop van de eenmalige-uitgavensectie. */
function expenseHeader(m: MonthData): number {
  const overflow = m.reservationPots
    .filter((p) => !p.finalized)
    .flatMap((p) => p.paymentsThisMonth.filter((pay) => pay.fromCash > 0).map((pay) => pay.fromCash))
    .reduce((s, a) => s + a, 0);
  return m.expenseItems.filter((i) => !i.paid).reduce((s, i) => s + i.amount, 0) + overflow;
}

/** ReservationSection.tsx — `calcSubtotaal`, zonder lokale bedragoverrides. */
function potHeader(m: MonthData, potType: ReservationPotBalance['potType'], isCurrentMonth: boolean): number {
  const activePots = m.reservationPots.filter((p) => !p.finalized && p.potType === potType);
  return activePots.reduce((s, p) => {
    if (isCurrentMonth) {
      if (p.potType === 'maandelijks_budget') return s + p.provisionThisMonth - paidFromPot(p);
      if (p.potType === 'spaardoel') {
        return s + p.deferredFromPrevious + p.provisionThisMonth - paidFromPot(p);
      }
    }
    return s + p.displayContribution;
  }, 0);
}

// ── Digest ───────────────────────────────────────────────────────────────────

/** Afronden op micro-eenheden: verbergt herschikkingsruis, niet echte verschillen. */
function r(n: number): number {
  const v = Math.round(n * 1e6) / 1e6;
  return Object.is(v, -0) ? 0 : v;
}

function digestMonth(m: MonthData, index: number) {
  const isFirst = index === 0;
  return {
    monthKey: m.monthKey,
    startBalance: r(m.startBalance),
    endBalance: r(m.endBalance),
    availableBudget: r(m.availableBudget),
    totalIncome: r(m.totalIncome),
    totalRecurring: r(m.totalRecurring),
    totalExpenses: r(m.totalExpenses),
    totalOutstandingCosts: r(m.totalOutstandingCosts),
    totalReservationDeductions: r(m.totalReservationDeductions),
    totalReservationCashPayments: r(m.totalReservationCashPayments),
    deferredRecurringAmount: r(m.deferredRecurringAmount),
    deferredReservationAmount: r(m.deferredReservationAmount),
    pots: [...m.reservationPots]
      .sort((a, b) => a.reservationId.localeCompare(b.reservationId))
      .map((p) => ({
        id: p.reservationId,
        potBalance: r(p.potBalance),
        provisionThisMonth: r(p.provisionThisMonth),
        deferredFromPrevious: r(p.deferredFromPrevious),
        displayContribution: r(p.displayContribution),
        releasedThisMonth: r(p.releasedThisMonth),
        effectiveAmount: r(p.effectiveAmount),
        finalized: p.finalized,
        isDeficitBuffer: p.isDeficitBuffer,
        deficitCoverage: p.deficitCoverage === null ? null : r(p.deficitCoverage),
        deficitUncovered: r(p.deficitUncovered),
      })),
    ui: {
      monthCard: (() => {
        const f = monthCardFigures(m, isFirst);
        return {
          vast: r(f.vast),
          eenmalig: r(f.eenmalig),
          budgetten: r(f.budgetten),
          provisies: r(f.provisies),
          inkomsten: r(f.inkomsten),
          kosten: r(f.kosten),
          eindsaldo: r(f.eindsaldo),
        };
      })(),
      incomeHeader: r(incomeHeader(m)),
      recurringHeader: r(recurringHeader(m)),
      expenseHeader: r(expenseHeader(m)),
      budgetHeader: r(potHeader(m, 'maandelijks_budget', isFirst)),
      provisionHeader: r(potHeader(m, 'spaardoel', isFirst)),
    },
  };
}

function runScenario(s: Scenario) {
  const anchor = computeAnchorState(
    s.referenceBalance, s.referenceMonth, s.anchorMonth, s.expenseItems, s.incomeItems,
    s.recurringItems, s.reservations, s.reservationPayments, s.recurringDefers,
    s.recurringSettlements, s.reservationDefers, s.reservationSettlements, s.balanceOverrides,
  );

  const months = calculateMonths(
    s.anchorMonth, anchor.startBalance, s.expenseItems, s.incomeItems, s.recurringItems,
    s.reservations, s.reservationPayments, s.recurringDefers, s.recurringSettlements,
    s.reservationDefers, s.reservationSettlements, 4, anchor.potBalances,
  );

  return {
    seed: s.seed,
    anchorMonth: s.anchorMonth,
    anchorStartBalance: r(anchor.startBalance),
    anchorPotBalances: [...anchor.potBalances.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, balance]) => ({ id, balance: r(balance) })),
    months: months.map(digestMonth),
  };
}

const SCENARIO_COUNT = 300;
const results = Array.from({ length: SCENARIO_COUNT }, (_, i) => runScenario(buildScenario(i + 1)));

console.log(JSON.stringify({ scenarioCount: SCENARIO_COUNT, results }, null, 1));
