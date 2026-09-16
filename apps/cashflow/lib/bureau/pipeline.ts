/**
 * Verkoop, licht: kwalificatie, aantallen en conversies — zonder gewogen prognose.
 *
 * Er zit nergens een kans-per-fase in. Een verwachte waarde telt ongewogen mee als "open", en
 * conversies zijn tellingen over een periode met hun noemer erbij. Bij kleine aantallen is een
 * percentage geen voorspelling; de UI toont daarom altijd de breuk, en onder vijf beslissingen
 * geen percentage.
 */
import type { IsoDate, Opportunity, OpportunityStage } from './types.ts';
import { OPEN_STAGES, STAGES } from './types.ts';
import { daysBetween } from './periods.ts';
import { round2 } from './money.ts';

export const QUALIFICATION_ITEMS = ['behoefte', 'budgetruimte', 'beslisser', 'tijdspad'] as const;
export type QualificationItem = (typeof QUALIFICATION_ITEMS)[number];

/**
 * Gekwalificeerd = een concrete behoefte, plausibele investeringsruimte, een betrokken beslisser en
 * een serieus tijdspad. Wat ontbreekt staat bij naam; het stadium in de lijst zegt niets over of
 * die vier er echt zijn.
 */
export function qualification(o: Opportunity): { qualified: boolean; missing: QualificationItem[] } {
  const missing: QualificationItem[] = [];
  if (!o.need.trim()) missing.push('behoefte');
  if (o.budget.status === 'onbekend' || o.budget.amount === null || o.budget.amount <= 0) missing.push('budgetruimte');
  if (!o.decisionMakerInvolved) missing.push('beslisser');
  if (o.expectedDecisionDate === null && o.expectedExecution === null) missing.push('tijdspad');
  return { qualified: missing.length === 0, missing };
}

export type Period = { from: IsoDate; to: IsoDate };

/** Is `stage` in de periode bereikt, volgens de historie? */
const bereiktIn = (o: Opportunity, stage: OpportunityStage, p: Period) => o.history.some((h) => h.stage === stage && h.on >= p.from && h.on <= p.to);
const ooitBereikt = (o: Opportunity, stage: OpportunityStage) => o.history.some((h) => h.stage === stage);

export type StageCounts = {
  period: Period;
  /** Hoeveel kansen dit stadium in de periode bereikten. */
  entered: Record<OpportunityStage, number>;
  /** Stand nu, los van de periode. */
  openNow: Record<OpportunityStage, number>;
  /** Kansen die in de periode ontstonden. */
  created: number;
};

export function stageCounts(opps: Opportunity[], period: Period): StageCounts {
  const leeg = () => Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<OpportunityStage, number>;
  const entered = leeg();
  const openNow = leeg();
  for (const o of opps) {
    for (const s of STAGES) if (bereiktIn(o, s, period)) entered[s]++;
    openNow[o.stage]++;
  }
  return { period, entered, openNow, created: opps.filter((o) => o.createdAt >= period.from && o.createdAt <= period.to).length };
}

export type Conversion = {
  from: OpportunityStage;
  to: OpportunityStage;
  /** Kansen die `from` bereikten in de periode. */
  denominator: number;
  /** Daarvan: hoeveel ooit `to` bereikten. */
  numerator: number;
  /** `null` bij noemer 0. */
  rate: number | null;
};

export const DEFAULT_CONVERSIONS: ReadonlyArray<[OpportunityStage, OpportunityStage]> = [
  ['gesprek', 'voorstel'],
  ['voorstel', 'gewonnen'],
];

export function conversion(opps: Opportunity[], period: Period, from: OpportunityStage, to: OpportunityStage): Conversion {
  const basis = opps.filter((o) => bereiktIn(o, from, period));
  const numerator = basis.filter((o) => ooitBereikt(o, to)).length;
  return { from, to, denominator: basis.length, numerator, rate: basis.length ? round2(numerator / basis.length) : null };
}

export function conversions(opps: Opportunity[], period: Period, pairs = DEFAULT_CONVERSIONS): Conversion[] {
  return pairs.map(([from, to]) => conversion(opps, period, from, to));
}

/**
 * Van de voorstellen die in de periode beslist werden: gewonnen tegenover verloren. Geparkeerd telt
 * niet als beslist. Een kans die in de periode van gewonnen naar verloren ging (of omgekeerd) telt
 * één keer, op haar laatste beslissing.
 */
export function winRate(opps: Opportunity[], period: Period): { won: number; lost: number; decided: number; rate: number | null } {
  const laatste = (o: Opportunity) =>
    [...o.history].filter((h) => (h.stage === 'gewonnen' || h.stage === 'verloren') && h.on >= period.from && h.on <= period.to).sort((a, b) => a.on.localeCompare(b.on)).at(-1)?.stage ?? null;
  const beslist = opps.filter((o) => ooitBereikt(o, 'voorstel')).map(laatste);
  const won = beslist.filter((x) => x === 'gewonnen').length;
  const lost = beslist.filter((x) => x === 'verloren').length;
  const decided = won + lost;
  return { won, lost, decided, rate: decided ? round2(won / decided) : null };
}

export function isOpen(o: Opportunity): boolean {
  return OPEN_STAGES.includes(o.stage);
}

export function overdueActions(opps: Opportunity[], asOf: IsoDate, graceDays: number): Array<{ opportunity: Opportunity; daysOverdue: number }> {
  return opps
    .filter((o) => isOpen(o) && o.nextAction !== null && /^\d{4}-\d{2}-\d{2}$/.test(o.nextAction.date))
    .map((o) => ({ opportunity: o, daysOverdue: daysBetween(o.nextAction!.date, asOf) }))
    .filter((x) => x.daysOverdue > graceDays)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export function withoutNextAction(opps: Opportunity[]): Opportunity[] {
  return opps.filter((o) => isOpen(o) && o.nextAction === null);
}

export type OpenPipeline = { count: number; proposals: number; value: number; withoutValue: number; qualified: number };

/** De open kansen: aantal, voorstellen, ongewogen verwachte waarde en hoeveel er geen waarde dragen. */
export function openPipeline(opps: Opportunity[]): OpenPipeline {
  const open = opps.filter(isOpen);
  return {
    count: open.length,
    proposals: open.filter((o) => o.stage === 'voorstel').length,
    value: round2(open.reduce((s, o) => s + (o.expectedValue ?? 0), 0)),
    withoutValue: open.filter((o) => o.expectedValue === null).length,
    qualified: open.filter((o) => qualification(o).qualified).length,
  };
}

/** Het kalenderjaar, of één kwartaal ervan. */
export function periodOf(year: number, quarter: 1 | 2 | 3 | 4 | null): Period {
  if (quarter === null) return { from: `${year}-01-01`, to: `${year}-12-31` };
  const eind = ['03-31', '06-30', '09-30', '12-31'][quarter - 1];
  return { from: `${year}-${String((quarter - 1) * 3 + 1).padStart(2, '0')}-01`, to: `${year}-${eind}` };
}

/**
 * Onder deze noemer toont de UI geen percentage, alleen de breuk. Eén gewonnen van twee is
 * geen "50 % win rate" — het is één en twee.
 */
export const RATE_MIN_DENOMINATOR = 5;

export function presentableRate(x: { rate: number | null; denominator: number }): number | null {
  return x.denominator >= RATE_MIN_DENOMINATOR ? x.rate : null;
}
