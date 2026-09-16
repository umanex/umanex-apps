/**
 * Het doelenformulier als tekst, en de weg terug naar `BusinessGoals`.
 *
 * Een formulier houdt tekst vast, geen getallen: "200." is halverwege "200.000" en mag niet
 * tussentijds 200 worden. Pas bij opslaan wordt alles gelezen, en een veld dat niet te lezen is
 * blokkeert het opslaan met een melding bij dat veld — het wordt nooit stil 0.
 */
import type { BusinessGoals, WorkCategory } from './types.ts';
import { WORK_CATEGORIES } from './types.ts';
import { parseNumber, toInputValue } from './format.ts';

export const SIGNALS = ['negativeCash', 'overbooking', 'projectOverrun', 'clientConcentration', 'overdueSalesAction', 'revenueGap'] as const;
export type SignalKey = (typeof SIGNALS)[number];

export type GoalsDraft = {
  revenueTarget: string;
  quarters: [string, string, string, string];
  daysTotal: string;
  daysBuffer: string;
  daysPerCategory: Record<WorkCategory, string>;
  hoursPerDay: string;
  daysPerWeek: string;
  /** Percentage, 0–100. */
  maxClientShare: string;
  monthlyCashNeed: string;
  targetRevenuePerDay: string;
  targetMarginPerDay: string;
  signalsEnabled: Record<SignalKey, boolean>;
  negativeCashFloor: string;
  overbookingToleranceDays: string;
  /** Percentage: 110 = (besteed + resterend) mag 10 % boven begroot. */
  projectOverrunPercent: string;
  overdueGraceDays: string;
};

export type DraftField = Exclude<keyof GoalsDraft, 'quarters' | 'daysPerCategory' | 'signalsEnabled'> | 'quarters' | `days.${WorkCategory}`;

export function draftFromGoals(g: BusinessGoals): GoalsDraft {
  const s = g.signals;
  return {
    revenueTarget: toInputValue(g.revenueTarget),
    quarters: g.quarterTargets ? (g.quarterTargets.map(toInputValue) as GoalsDraft['quarters']) : ['', '', '', ''],
    daysTotal: toInputValue(g.days.total),
    daysBuffer: toInputValue(g.days.buffer),
    daysPerCategory: Object.fromEntries(WORK_CATEGORIES.map((c) => [c, toInputValue(g.days.perCategory[c])])) as Record<WorkCategory, string>,
    hoursPerDay: toInputValue(g.hoursPerDay),
    daysPerWeek: toInputValue(g.daysPerWeek),
    maxClientShare: toInputValue(Math.round(g.maxClientShare * 10_000) / 100),
    monthlyCashNeed: toInputValue(g.monthlyCashNeed),
    targetRevenuePerDay: toInputValue(g.targetRevenuePerDay),
    targetMarginPerDay: toInputValue(g.targetMarginPerDay),
    signalsEnabled: {
      negativeCash: s.negativeCash.enabled,
      overbooking: s.overbooking.enabled,
      projectOverrun: s.projectOverrun.enabled,
      clientConcentration: s.clientConcentration.enabled,
      overdueSalesAction: s.overdueSalesAction.enabled,
      revenueGap: s.revenueGap.enabled,
    },
    negativeCashFloor: toInputValue(s.negativeCash.floor),
    overbookingToleranceDays: toInputValue(s.overbooking.toleranceDays),
    projectOverrunPercent: toInputValue(Math.round(s.projectOverrun.ratio * 10_000) / 100),
    overdueGraceDays: toInputValue(s.overdueSalesAction.graceDays),
  };
}

export type DraftResult = { ok: true; goals: BusinessGoals } | { ok: false; errors: Partial<Record<DraftField, string>> };

export function goalsFromDraft(year: number, d: GoalsDraft): DraftResult {
  const errors: Partial<Record<DraftField, string>> = {};
  const lees = (field: DraftField, value: string, rule: (n: number) => string | null): number => {
    const n = parseNumber(value);
    if (n === null) {
      errors[field] = value.trim() === '' ? 'Vul een waarde in.' : 'Geen getal — gebruik bv. 200.000 of 7,5.';
      return 0;
    }
    const fout = rule(n);
    if (fout) errors[field] = fout;
    return n;
  };
  const leesOptioneel = (field: DraftField, value: string): number | null => {
    if (value.trim() === '') return null;
    return lees(field, value, nietNegatief);
  };
  const nietNegatief = (n: number) => (n < 0 ? 'Mag niet negatief zijn.' : null);
  const heelGetal = (n: number) => (n < 0 || !Number.isInteger(n) ? 'Een heel aantal dagen, 0 of meer.' : null);

  const revenueTarget = lees('revenueTarget', d.revenueTarget, nietNegatief);

  const ingevuld = d.quarters.filter((q) => q.trim() !== '').length;
  let quarterTargets: BusinessGoals['quarterTargets'] = null;
  if (ingevuld === 4) {
    const q = d.quarters.map((v) => parseNumber(v));
    if (q.some((v) => v === null || v < 0)) errors.quarters = 'Elk kwartaal is een bedrag van 0 of meer.';
    else quarterTargets = q as [number, number, number, number];
  } else if (ingevuld > 0) {
    errors.quarters = `Vul alle vier de kwartalen in, of laat ze alle vier leeg (nu ${ingevuld} van 4).`;
  }

  const perCategory = Object.fromEntries(
    WORK_CATEGORIES.map((c) => [c, lees(`days.${c}`, d.daysPerCategory[c], nietNegatief)]),
  ) as Record<WorkCategory, number>;

  const goals: BusinessGoals = {
    year,
    revenueTarget,
    quarterTargets,
    days: {
      total: lees('daysTotal', d.daysTotal, nietNegatief),
      buffer: lees('daysBuffer', d.daysBuffer, nietNegatief),
      perCategory,
    },
    hoursPerDay: lees('hoursPerDay', d.hoursPerDay, (n) => (n > 0 && n <= 24 ? null : 'Tussen 0 en 24 uur.')),
    daysPerWeek: lees('daysPerWeek', d.daysPerWeek, (n) => (n > 0 && n <= 7 ? null : 'Tussen 0 en 7 dagen.')),
    maxClientShare: lees('maxClientShare', d.maxClientShare, (n) => (n > 0 && n <= 100 ? null : 'Een percentage tussen 0 en 100.')) / 100,
    monthlyCashNeed: lees('monthlyCashNeed', d.monthlyCashNeed, nietNegatief),
    targetRevenuePerDay: leesOptioneel('targetRevenuePerDay', d.targetRevenuePerDay),
    targetMarginPerDay: leesOptioneel('targetMarginPerDay', d.targetMarginPerDay),
    signals: {
      negativeCash: { enabled: d.signalsEnabled.negativeCash, floor: lees('negativeCashFloor', d.negativeCashFloor, () => null) },
      overbooking: { enabled: d.signalsEnabled.overbooking, toleranceDays: lees('overbookingToleranceDays', d.overbookingToleranceDays, nietNegatief) },
      projectOverrun: {
        enabled: d.signalsEnabled.projectOverrun,
        ratio: lees('projectOverrunPercent', d.projectOverrunPercent, (n) => (n >= 100 ? null : 'Minstens 100 % — onder de begroting is geen overschrijding.')) / 100,
      },
      clientConcentration: { enabled: d.signalsEnabled.clientConcentration },
      overdueSalesAction: { enabled: d.signalsEnabled.overdueSalesAction, graceDays: lees('overdueGraceDays', d.overdueGraceDays, heelGetal) },
      revenueGap: { enabled: d.signalsEnabled.revenueGap },
    },
  };

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, goals };
}

/** De getallen die de somregels live tonen — `null` zolang een veld niet te lezen is. */
export function draftSums(d: GoalsDraft) {
  const n = (v: string) => parseNumber(v);
  const cats = WORK_CATEGORIES.map((c) => n(d.daysPerCategory[c]));
  const buffer = n(d.daysBuffer);
  const total = n(d.daysTotal);
  const days = cats.every((c): c is number => c !== null) && buffer !== null && total !== null
    ? { sum: cats.reduce((s, c) => s + c, 0) + buffer, total, deviation: cats.reduce((s, c) => s + c, 0) + buffer - total }
    : null;
  const q = d.quarters.map(n);
  const target = n(d.revenueTarget);
  const quarters = q.every((v): v is number => v !== null) && target !== null
    ? { sum: q.reduce((s, v) => s + v, 0), target, deviation: q.reduce((s, v) => s + v, 0) - target }
    : null;
  return { days, quarters };
}
