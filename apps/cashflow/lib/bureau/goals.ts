/**
 * Doelen per boekjaar en de controles die tonen waar ze niet sluiten.
 *
 * Niets hier corrigeert een ingestelde waarde. Tellen de dagbudgetten niet op tot het totaal,
 * of de kwartalen niet tot het jaardoel, dan is het verschil de uitkomst — de gebruiker beslist
 * welke kant fout staat.
 */
import type { MonthData } from '../cashflow/types.ts';
import type { BureauData, BusinessGoals, WorkCategory } from './types.ts';
import { WORK_CATEGORIES } from './types.ts';

/** Rekenconventie wanneer er voor een jaar nog geen doelen zijn. Een tijdregistratie legt hem vast. */
export const DEFAULT_HOURS_PER_DAY = 8;

/**
 * Startwaarden, bewerkbaar. Afkomstig uit de opdracht voor 2027 — aannames, geen regels.
 * Er staat hier bewust geen verkoopprijs per aanbodtype.
 */
export function defaultGoals(year: number): BusinessGoals {
  return {
    year,
    revenueTarget: 200_000,
    quarterTargets: [40_000, 55_000, 45_000, 60_000],
    days: {
      total: 200,
      buffer: 10,
      perCategory: { klantwerk: 128, verkoop: 40, 'umanex-os': 12, administratie: 10 },
    },
    hoursPerDay: DEFAULT_HOURS_PER_DAY,
    daysPerWeek: 5,
    maxClientShare: 0.3,
    monthlyCashNeed: 11_000,
    targetRevenuePerDay: null,
    targetMarginPerDay: null,
    signals: {
      negativeCash: { enabled: true, floor: 0 },
      overbooking: { enabled: true, toleranceDays: 0 },
      projectOverrun: { enabled: true, ratio: 1 },
      clientConcentration: { enabled: true },
      overdueSalesAction: { enabled: true, graceDays: 0 },
      revenueGap: { enabled: true },
    },
  };
}

/** De opgeslagen doelen van een jaar, of `null` — nooit stil de startwaarden. */
export function goalsFor(bureau: BureauData, year: number): BusinessGoals | null {
  return bureau.goals[String(year)] ?? null;
}

export function hoursPerDayFor(bureau: BureauData, year: number): number {
  const h = goalsFor(bureau, year)?.hoursPerDay;
  return typeof h === 'number' && h > 0 ? h : DEFAULT_HOURS_PER_DAY;
}

/** Doel voor A: expliciet ingesteld, anders omzetdoel ÷ klantwerkdagen, anders onbekend. */
export function revenuePerDayTarget(g: BusinessGoals): number | null {
  if (g.targetRevenuePerDay !== null) return g.targetRevenuePerDay;
  const clientDays = g.days.perCategory.klantwerk;
  return clientDays > 0 ? g.revenueTarget / clientDays : null;
}

export type RegisteredOutflow = {
  /** De maanden waarover gemiddeld is. Alleen maanden met stroom-basis (`'vrij'`). */
  months: string[];
  perMonth: { recurring: number; oneOff: number; budgets: number; provisions: number; total: number };
};

/**
 * Wat de maandprognose vandaag per maand aan uitgaven draagt: vaste kosten, eenmalige
 * uitgaven, budgetten en provisies — de buffer niet, want dat is geen kost maar opzijgezet
 * overschot. Alleen latere maanden (`basis: 'vrij'`): in de ankermaand zijn de koppen posities
 * (wat nog af moet), geen stromen, en zouden ze het gemiddelde vertekenen.
 *
 * Provisies bevatten ook de btw-pot als die als provisie is ingesteld. Dat wordt niet op naam
 * uitgefilterd: een label is geen bewijs van wat een pot is. De opsplitsing per kop staat erbij
 * zodat het verschil met de aanname leesbaar blijft.
 */
export function registeredOutflow(months: MonthData[]): RegisteredOutflow | null {
  const flows = months.filter((m) => m.subtotals.basis === 'vrij');
  if (flows.length === 0) return null;
  const sum = (pick: (m: MonthData) => number) => flows.reduce((s, m) => s + pick(m), 0) / flows.length;
  const recurring = sum((m) => m.subtotals.recurring);
  const oneOff = sum((m) => m.subtotals.oneOff);
  const budgets = sum((m) => m.subtotals.budgets);
  const provisions = sum((m) => m.subtotals.provisions);
  return {
    months: flows.map((m) => m.monthKey),
    perMonth: { recurring, oneOff, budgets, provisions, total: recurring + oneOff + budgets + provisions },
  };
}

export type GoalsConsistency = {
  days: {
    perCategory: Record<WorkCategory, number>;
    sumCategories: number;
    buffer: number;
    total: number;
    /** (Σ categorieën + buffer) − totaal. 0 = sluit. */
    deviation: number;
  };
  quarters: { sum: number; target: number; deviation: number } | null;
  cashNeed: { assumed: number; registered: RegisteredOutflow | null; deviation: number | null };
};

export function goalsConsistency(g: BusinessGoals, registered: RegisteredOutflow | null): GoalsConsistency {
  const sumCategories = WORK_CATEGORIES.reduce((s, c) => s + g.days.perCategory[c], 0);
  const quarterSum = g.quarterTargets ? g.quarterTargets.reduce((s, q) => s + q, 0) : null;
  return {
    days: {
      perCategory: g.days.perCategory,
      sumCategories,
      buffer: g.days.buffer,
      total: g.days.total,
      deviation: sumCategories + g.days.buffer - g.days.total,
    },
    quarters: quarterSum === null ? null : { sum: quarterSum, target: g.revenueTarget, deviation: quarterSum - g.revenueTarget },
    cashNeed: {
      assumed: g.monthlyCashNeed,
      registered,
      deviation: registered ? g.monthlyCashNeed - registered.perMonth.total : null,
    },
  };
}
