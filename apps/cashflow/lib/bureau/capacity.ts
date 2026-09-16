/**
 * Eigen capaciteit: besteed, gepland, vrij, buffer en overbelasting — per jaar en per week.
 *
 * Besteed en gepland overlappen niet, en dat is een afspraak over de tijd, niet over de gegevens:
 *   - besteed = registraties op of vóór vandaag;
 *   - gepland = werk in periodes die nog niet voorbij zijn, en dat getal is het RESTERENDE werk.
 * Een planning voor een periode die al voorbij is, telt niet meer mee en wordt apart gemeld: wat
 * toen gebeurde, staat in de registraties.
 *
 * De buffer is gereserveerde capaciteit, geen categorie. Gaat een categorie over haar budget, dan
 * vangt de buffer dat eerst op; pas wat daarboven uitkomt is overbelasting. Freelancer-uren
 * bestaan hier niet — die zijn kosten op een project, geen eigen capaciteit.
 */
import type { BureauData, BusinessGoals, IsoDate, PlannedWork, WeekKey, WorkCategory } from './types.ts';
import { WORK_CATEGORIES } from './types.ts';
import { EPSILON, round2 } from './money.ts';
import { entryDays } from './profitability.ts';
import { lastWeekOfMonth, weekMonthCells, weekRange, yearOf } from './periods.ts';

const geldigeDatum = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

/** Laatste dag van de periode van een planning. */
function periodEnd(w: PlannedWork): IsoDate | null {
  if (w.periodKind === 'week') return /^\d{4}-W\d{2}$/.test(w.periodKey) ? weekRange(w.periodKey).to : null;
  if (!/^\d{4}-\d{2}$/.test(w.periodKey)) return null;
  return weekMonthCells(lastWeekOfMonth(w.periodKey)).find((c) => c.monthKey === w.periodKey)?.to ?? null;
}

/** Het deel van een planning dat in `year` valt. Een week over de jaarwissel telt per dag. */
function daysInYear(w: PlannedWork, year: number): number {
  if (w.periodKind === 'month') return yearOf(w.periodKey) === year ? w.days : 0;
  const cells = weekMonthCells(w.periodKey);
  const inJaar = cells.filter((c) => yearOf(c.monthKey) === year).reduce((s, c) => s + c.days, 0);
  return (w.days * inJaar) / 7;
}

export type CategoryCapacity = {
  category: WorkCategory;
  budgetDays: number;
  spentDays: number;
  plannedDays: number;
  committedDays: number;
  /** Budget − besteed − gepland; negatief = de categorie gaat erover. */
  freeDays: number;
  overrunDays: number;
};

export type YearCapacity = {
  year: number;
  asOf: IsoDate;
  categories: CategoryCapacity[];
  totals: { budgetDays: number; spentDays: number; plannedDays: number; freeDays: number };
  buffer: { budgetDays: number; absorbedDays: number; remainingDays: number };
  /** Overschrijding boven de buffer. */
  overbookedDays: number;
  /** Klantwerk: budget − besteed − gepland. De noemer voor "omzet per resterende klantdag". Kan ≤ 0 zijn. */
  unallocatedClientDays: number;
  /** Planning voor periodes die al voorbij zijn: telt niet, maar staat er. */
  stalePlannedDays: number;
  /** Registraties met een datum na vandaag: tellen niet als besteed. */
  futureEntries: number;
  hasEntries: boolean;
  hasPlans: boolean;
};

export function yearCapacity(bureau: BureauData, goals: BusinessGoals, year: number, asOf: IsoDate): YearCapacity {
  const entries = bureau.timeEntries.filter((e) => geldigeDatum(e.date) && yearOf(e.date) === year);
  const besteed = entries.filter((e) => e.date <= asOf);
  let stale = 0;
  const plannen: Array<{ w: PlannedWork; dagen: number }> = [];
  for (const w of bureau.plannedWork) {
    const dagen = daysInYear(w, year);
    if (dagen <= EPSILON) continue;
    const einde = periodEnd(w);
    if (einde === null) continue;
    if (einde < asOf) stale += dagen;
    else plannen.push({ w, dagen });
  }

  const categories: CategoryCapacity[] = WORK_CATEGORIES.map((category) => {
    const budgetDays = goals.days.perCategory[category];
    const spentDays = besteed.filter((e) => e.category === category).reduce((s, e) => s + entryDays(e), 0);
    const plannedDays = plannen.filter((p) => p.w.category === category).reduce((s, p) => s + p.dagen, 0);
    const committedDays = spentDays + plannedDays;
    return {
      category,
      budgetDays,
      spentDays: round2(spentDays),
      plannedDays: round2(plannedDays),
      committedDays: round2(committedDays),
      freeDays: round2(budgetDays - committedDays),
      overrunDays: round2(Math.max(0, committedDays - budgetDays)),
    };
  });

  const overrun = categories.reduce((s, c) => s + c.overrunDays, 0);
  const absorbed = Math.min(overrun, goals.days.buffer);
  const klant = categories.find((c) => c.category === 'klantwerk')!;
  const som = (k: 'budgetDays' | 'spentDays' | 'plannedDays') => round2(categories.reduce((s, c) => s + c[k], 0));

  return {
    year,
    asOf,
    categories,
    totals: { budgetDays: som('budgetDays'), spentDays: som('spentDays'), plannedDays: som('plannedDays'), freeDays: round2(som('budgetDays') - som('spentDays') - som('plannedDays')) },
    buffer: { budgetDays: goals.days.buffer, absorbedDays: round2(absorbed), remainingDays: round2(goals.days.buffer - absorbed) },
    overbookedDays: round2(Math.max(0, overrun - goals.days.buffer)),
    unallocatedClientDays: klant.freeDays,
    stalePlannedDays: round2(stale),
    futureEntries: entries.length - besteed.length,
    hasEntries: besteed.length > 0,
    hasPlans: plannen.length > 0,
  };
}

export type WeekCapacity = {
  weekKey: WeekKey;
  from: IsoDate;
  to: IsoDate;
  spentDays: number;
  plannedDays: number;
  loadDays: number;
  ceilingDays: number;
  overbookedDays: number;
  /** Maandplanning in de maanden van deze week — niet per week verdeeld, dus apart getoond. */
  monthPlannedDays: number;
  byProject: Array<{ projectId: string; spentDays: number; plannedDays: number }>;
};

export function weekCapacity(bureau: BureauData, goals: BusinessGoals, weeks: WeekKey[], asOf: IsoDate): WeekCapacity[] {
  return weeks.map((w) => {
    const { from, to } = weekRange(w);
    const entries = bureau.timeEntries.filter((e) => e.date >= from && e.date <= to && e.date <= asOf);
    const plans = to < asOf ? [] : bureau.plannedWork.filter((p) => p.periodKind === 'week' && p.periodKey === w);
    const maanden = new Set(weekMonthCells(w).map((c) => c.monthKey));
    const maandplan = to < asOf ? [] : bureau.plannedWork.filter((p) => p.periodKind === 'month' && maanden.has(p.periodKey));
    const spentDays = entries.reduce((s, e) => s + entryDays(e), 0);
    const plannedDays = plans.reduce((s, p) => s + p.days, 0);
    const projecten = new Set([...entries.map((e) => e.projectId), ...plans.map((p) => p.projectId)].filter((x): x is string => x !== null));
    return {
      weekKey: w,
      from,
      to,
      spentDays: round2(spentDays),
      plannedDays: round2(plannedDays),
      loadDays: round2(spentDays + plannedDays),
      ceilingDays: goals.daysPerWeek,
      overbookedDays: round2(Math.max(0, spentDays + plannedDays - goals.daysPerWeek)),
      monthPlannedDays: round2(maandplan.reduce((s, p) => s + p.days, 0)),
      byProject: [...projecten].map((projectId) => ({
        projectId,
        spentDays: round2(entries.filter((e) => e.projectId === projectId).reduce((s, e) => s + entryDays(e), 0)),
        plannedDays: round2(plans.filter((p) => p.projectId === projectId).reduce((s, p) => s + p.days, 0)),
      })),
    };
  });
}
